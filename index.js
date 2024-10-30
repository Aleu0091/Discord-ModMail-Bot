const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ChannelType,
    Partials,
    ThreadAutoArchiveDuration,
} = require("discord.js");
const {
    token,
    modMailChannelId,
    mentionTeamE,
    mentionTeamO,
} = require("./config.json");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel],
});

const startTime = moment();
const activeThreads = new Map();

require("dotenv").config();

client.on("messageCreate", async (message) => {
    if (!message.guild && !message.author.bot) {
        if (message.content.length > 3000) {
            const embed = new EmbedBuilder()
                .setTitle("Error")
                .setDescription(
                    "Your message exceeds the 3000 character limit. Please shorten your message and try again."
                )
                .setColor(15548997);
            return message.channel.send({ embeds: [embed] });
        }

        const modmailChannel = client.channels.cache.get(modMailChannelId);

        if (modmailChannel) {
            let thread = activeThreads.get(message.author.id);
            let mentionTeam = mentionTeamO;
            const currentHour = new Date().getHours();
            if (currentHour >= 22 || currentHour < 8) {
                mentionTeam = mentionTeamE;
            }
            if (!thread) {
                message.react("📨");
                const user = await client.users.fetch(message.author.id);
                const embed = new EmbedBuilder()
                    .setTitle("Thank you for reaching out!")
                    .setDescription(
                        "A moderator will respond to you as soon as possible."
                    )
                    .setColor(32767);
                user.send({ embeds: [embed] });

                thread = await modmailChannel.threads.create({
                    name: `Modmail from ${message.author.tag}(${message.author.id})`,
                    autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
                    reason: `Modmail thread created for ${message.author.tag}`,
                });

                activeThreads.set(message.author.id, thread);
                thread.send({
                    content: `<@&${mentionTeam}>\n📩 **New Modmail** from ${message.author.tag} (${message.author.id})`,
                });
                thread.send({
                    content: `**${message.author.tag}** : ${message.content}`,
                });

                if (message.attachments.size > 0) {
                    message.attachments.forEach((attachment) => {
                        thread.send({
                            content: `**Attachment** : ${attachment.url}`,
                        });
                    });
                }
            } else {
                message.react("📨");

                thread.send({
                    content: `**${message.author.tag}** : ${message.content}`,
                });

                if (message.attachments.size > 0) {
                    message.attachments.forEach((attachment) => {
                        thread.send({
                            content: `**Attachment** : ${attachment.url}`,
                        });
                    });
                }
            }
        }
    }

    if (
        message.channel.type === ChannelType.PublicThread &&
        !message.author.bot &&
        message.channel.parentId === modMailChannelId
    ) {
        if (message.content === "!close") {
            const userId = message.channel.name.match(/\((.*?)\)/)[1];

            await message.channel.send("🛑 **Thread closed by mod.**");
            activeThreads.delete(userId);
            const user = await client.users.fetch(userId);

            const embed = new EmbedBuilder()
                .setTitle("Your inquiry has been closed.")
                .setDescription("Thank you for reaching out!")
                .setColor(32767);
            if (user) {
                user.send({ embeds: [embed] });
            }
            await message.channel.setArchived(true, "Modmail thread closed");
        } else {
            const userId = message.channel.name.match(/\((.*?)\)/)[1];
            if (!activeThreads.get(userId)) return;

            const user = await client.users.fetch(userId);

            if (user) {
                user.send(`**TEAM** : ${message.content}`);
            }
        }
    }
});

client.login(token).then(() => {
    const endTime = moment();
    const loginTime = moment.duration(endTime.diff(startTime)).asSeconds();
    const currentTime = endTime.format("YYYY-MM-DD HH:mm:ss");
    console.log(
        `[${currentTime}] INFO: Login successful. Took ${loginTime} seconds.`
    );
});

client.on("error", async (error) => {
    console.log(error);
});
process.on("uncaughtException", async (error) => {
    console.log(error);
});
