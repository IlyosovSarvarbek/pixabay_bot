import { Bot, InlineKeyboard } from "grammy";
import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const bot = new Bot(process.env.BOT_TOKEN);
const app = express();
const PORT = process.env.PORT || 3000;
const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;

const userSearches = new Map();

async function fetchImages(query, page = 1) {
    try {
        const response = await axios.get(`https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&image_type=photo&per_page=10&page=${page}`);
        return response.data.hits;
    } catch (error) {
        console.error("Error fetching images:", error);
        return [];
    }
}

bot.command("start", (ctx) => {
    const fullName = `${ctx.from.first_name ? ctx.from.first_name : ""} ${ctx.from.last_name ? ctx.from.last_name : ""}`
    ctx.reply(`Welcome ${fullName}! Search for any image and I'll send you images.`);
});

bot.on("message:text", async (ctx) => {
    const query = ctx.message.text;
    const images = await fetchImages(query);

    if (images.length === 0) {
        return ctx.reply("No images found for your search. Try another keyword!");
    }

    userSearches.set(ctx.chat.id, { query, page: 1 });

    for (const image of images) {
        const caption = `📸 <b>Tags:</b> ${image.tags}\n👤 <b>Uploader</b>: ${image.user}\n👀 <b>Views:</b> ${image.views}\n⬇️ <b>Downloads</b>: ${image.downloads}\n❤️ <b>Likes:</b> ${image.likes}`;
        
        await ctx.replyWithPhoto(image.webformatURL, { caption, parse_mode: "HTML" });
    }
    
    
    const keyboard = new InlineKeyboard().text("Show More", "show_more");
    ctx.reply("Want more?", { reply_markup: keyboard });
});

await bot.api.setMyCommands([
    {command:"start", description:"Start the bot"}
])

bot.callbackQuery("show_more", async (ctx) => {
    const userData = userSearches.get(ctx.chat.id);
    if (!userData) return ctx.answerCallbackQuery("No previous search found!");

    userData.page++;
    const images = await fetchImages(userData.query, userData.page);

    if (images.length === 0) {
        return ctx.reply("No more images found!");
    }

    for (const image of images) {
        const caption = `📸 *Tags:* ${image.tags}\n👤 *Uploader:* ${image.user}\n👀 *Views:* ${image.views}\n⬇️ *Downloads:* ${image.downloads}\n❤️ *Likes:* ${image.likes}`;
        
        await ctx.replyWithPhoto(image.webformatURL, { caption, parse_mode: "Markdown" });
    }
    
    
    const keyboard = new InlineKeyboard().text("Show More", "show_more");
    ctx.reply("Want more?", { reply_markup: keyboard });
    ctx.answerCallbackQuery();
});

app.get("/", (req, res) => {
    res.send("Bot is running!");
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

bot.start();
