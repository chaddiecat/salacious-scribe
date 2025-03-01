<<<<<<< HEAD
// Copyright 2021 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import app from './app.js';
import {logger, initLogCorrelation} from './utils/logging.js';
import {fetchProjectId} from './utils/metadata.js';

/**
 * Initialize app and start Express server
 */
const main = async () => {
  let project = process.env.GOOGLE_CLOUD_PROJECT;
  if (!project) {
    try {
      project = await fetchProjectId();
    } catch {
      logger.warn('Could not fetch Project Id for tracing.');
    }
  }
  // Initialize request-based logger with project Id
  initLogCorrelation(project);

  // Start server listening on PORT env var
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => logger.info(`Listening on port ${PORT}`));
};

/**
 * Listen for termination signal
 */
process.on('SIGTERM', () => {
  // Clean up resources on shutdown
  logger.info('Caught SIGTERM.');
  logger.flush();
});

main();
=======
// index.js
const { Client, GatewayIntentBits, SlashCommandBuilder, AttachmentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const fs = require('fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
require('dotenv').config(); // Load environment variables from .env file

// Initialize Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildPresences, GatewayIntentBits.MessageContent] });

const token = process.env.DISCORD_BOT_TOKEN;
const applicationId = '1345181203791216680';

// Replace with your development guild ID
const DEV_GUILD_ID = '1296841933045371001';

// Define the /scribe command
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

// Register slash commands
const rest = new REST({ version: '9' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        const data = await rest.put(
            Routes.applicationGuildCommands(applicationId, DEV_GUILD_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
        console.log(`Successfully registered ${data.length} application commands.`);
    } catch (error) {
        console.error('Error registering application commands:');
        console.error(error.message);
        console.error(error.stack);
        if (error.response) {
            console.error(`Data: ${JSON.stringify(error.response.data)}`);
            console.error(`Status: ${error.response.status}`);
            console.error(`Headers: ${JSON.stringify(error.response.headers)}`);
        }
    }
})();

// To register commands dynamically for each guild the bot is in:
// 1. Listen for the 'guildCreate' event.
// 2. When the event is triggered, grab the guild ID.
// 3. Register the commands for that specific guild using Routes.applicationGuildCommands.

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log('Connected to Discord gateway.');
});

client.on('shardError', error => {
    console.error('A websocket connection encountered an error:', error);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    await interaction.deferReply({ ephemeral: true }); // Defer the reply

    const includeUsernames = interaction.options.getBoolean('usernames') ?? false;
    const includeTimestamps = interaction.options.getBoolean('timestamps') ?? false;
    const includeReactions = interaction.options.getBoolean('reactions') ?? false;
    const filename = interaction.options.getString('filename');

   // Fetch messages
    const messages = await interaction.channel.messages.fetch({ limit: 100 }); // Adjust limit as needed

    let chatlog = '';

    // Fetch all messages
    let lastId;
    while (true) {
        const options = { limit: 100 };
        if (lastId) {
            options.before = lastId;
        }

        const messages = await interaction.channel.messages.fetch(options);

        if (!messages.size) {
            break;
        }

        chatlog += messages.map(msg => {
            let line = '';
            if (includeTimestamps) {
                line += `[${msg.createdAt.toISOString()}] `;
            }
            if (includeUsernames) {
                line += `${msg.author.username}: `;
            }
            // Remove user tags
            let content = msg.content.replace(/<@!?\d+>/g, '');

            line += content;

            if (includeReactions) {
                line += ` ${msg.reactions.cache.map(reaction => reaction.emoji.name).join(' ')}`;
            }

            return line;
        }).reverse().join('\n\n');

        lastId = messages.last().id;
    }

    // Sanitize filename
    const sanitizedFilename = filename ? filename.replace(/[^a-z0-9]/gi, '_').toLowerCase() : interaction.channel.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    // Create a buffer from the chatlog
    const buffer = Buffer.from(chatlog, 'utf-8');

    // Create a Discord attachment
    const attachment = new AttachmentBuilder(buffer, { name: `${sanitizedFilename}.md` });

    // Reply with the attachment
    await interaction.editReply({ files: [attachment] });
});

client.login(token);
>>>>>>> 7cb77e4 (Intial commit, working bot)
