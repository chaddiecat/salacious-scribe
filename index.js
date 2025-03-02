// index.js
const express = require('express');
const bot = require('./bot.js'); // Import the bot
require('dotenv').config();

const app = express();

app.get('/', (req, res) => {
    res.send('Hello World!');
});

exports.handler = app;

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    console.log('Starting Discord bot...');
    // Start the Discord bot after the Express server has started

});