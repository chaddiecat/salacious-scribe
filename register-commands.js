// register-commands.js
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const token = process.env.DISCORD_BOT_TOKEN;
const applicationId = '1345181203791216680';

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

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        const data = await rest.put(
            Routes.applicationCommands(applicationId),
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