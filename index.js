const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { InteractionType, InteractionResponseType } = require('discord-interactions');
const ua = require('universal-analytics');
const nacl = require('tweetnacl');
const express = require('express');

require('dotenv').config();

const token = process.env.DISCORD_BOT_TOKEN;
const applicationId = process.env.DISCORD_APPLICATION_ID;
const trackingId = process.env.GOOGLE_ANALYTICS_TRACKING_ID; // Your Google Analytics Tracking ID
const publicKey = process.env.DISCORD_PUBLIC_KEY; // Your Discord bot's public key

const commands = [
    new SlashCommandBuilder()
        .setName('scribe')
        .setDescription('Fetches and formats the chatlog. Select formatting options from the menu that follows.')
        .addStringOption(option =>
            option.setName('flags')
                .setDescription('Select formatting options')
                .setRequired(false)
                .addChoices(
                    { name: 'Usernames', value: 'usernames' },
                    { name: 'Timestamps', value: 'timestamps' },
                    { name: 'Reactions', value: 'reactions' }
                ))
        .addStringOption(option =>
            option.setName('filename')
                .setDescription('Custom filename for the transcript (defaults to channel name)')
                .setRequired(false)),
].map(command => command.toJSON());

const app = express();

function verifySignature(request) {
    const signature = request.get('X-Signature-Ed25519');
    const timestamp = request.get('X-Signature-Timestamp');
    const body = request.rawBody; // rawBody is expected to be present on the request object

    if (!signature || !timestamp || !body) {
        return false;
    }

    try {
        const isVerified = nacl.sign.detached.verify(
            Buffer.from(timestamp + body),
            Buffer.from(signature, 'hex'),
            Buffer.from(publicKey, 'hex')
        );
        return isVerified;
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
}

app.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
        if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }
    // Verify the signature
    if (!verifySignature(req)) {
        return res.status(401).send('Invalid signature');
    }

    const { body } = req;

    if (body.type === InteractionType.PING) {
        return res.status(200).send({ type: InteractionResponseType.PONG });
    }

    if (body.type === InteractionType.APPLICATION_COMMAND) {
        const { data, guild_id, channel_id } = body;
        const { name } = data;

        if (name === 'scribe') {
            let messagesTranscribed = 0;
            const flags = data.options?.find(option => option.name === 'flags')?.value;
            const includeUsernames = flags?.includes('usernames') ?? false;
            const includeTimestamps = flags?.includes('timestamps') ?? false;
            const includeReactions = flags?.includes('reactions') ?? false;
            const filename = data.options?.find(option => option.name === 'filename')?.value;

            const { REST } = require('@discordjs/rest');
            const { Routes } = require('discord-api-types/v9');

            const discordRest = new REST({ version: '9' }).setToken(token);

            async function fetchMessages(channelId, before) {
                const options = {
                    limit: 100,
                };
                if (before) {
                    options.before = before;
                }

                try {
                    const messages = await discordRest.get(Routes.channelMessages(channelId), { query: new URLSearchParams(options) });
                    return messages;
                } catch (error) {
                    console.error('Error fetching messages:', error);
                    return [];
                }
            }

            let chatlog = '';
            let lastId;

            while (true) {
                const messages = await fetchMessages(channel_id, lastId);

                if (!messages || messages.length === 0) {
                    break;
                }

                chatlog += messages.map(msg => {
                    let line = '';
                    if (includeTimestamps) {
                        line += `[${new Date(msg.timestamp).toISOString()}] `;
                    }
                    if (includeUsernames) {
                        line += `${msg.author.username}: `;
                    }
                    let content = msg.content.replace(/<@!?\d+>/g, '');
                    line += content;
                    if (includeReactions) {
                        line += ` ${msg.reactions?.map(reaction => reaction.emoji.name).join(' ') ?? ''}`;
                    }
                    messagesTranscribed++;
                    return line;
                }).reverse().join('\n\n');

                lastId = messages[0].id; // Use the first message's ID for 'before'
            }

            const sanitizedFilename = filename ? filename.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'transcript';
            const buffer = Buffer.from(chatlog, 'utf-8');
            const attachment = new AttachmentBuilder(buffer, { name: `${sanitizedFilename}.md` });

            // Google Analytics
            const visitor = ua(trackingId, {
                cid: guild_id || 'none',
            });

            visitor.event('Scribe', 'Markdown Generated', { sessionControl: 'start' }).send();
            visitor.event('Scribe', 'Messages Transcribed', messagesTranscribed).send();

            return res.status(200).send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: 'Here is your chatlog!',
                    files: [attachment],
                },
            });
        }
    }

    return res.status(400).send('Unknown interaction type');
});

exports.handler = app;

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
