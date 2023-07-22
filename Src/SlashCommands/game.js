const { Collection, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { getAvatarUrl, handleDatastoreAPI, handleMessageServiceAPI, returnDataKey, returnUniverses, settingCheck, validatePlayer } = require('../API/mainAPI');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('game')
        .setDescription('Manage game-related actions')
        .addSubcommand(subcommand =>
            subcommand
                .setName('kick')
                .setDescription('Kick a player from the game')
                .addStringOption(option =>
                    option.setName('server')
                        .setDescription('The name of the Server to ban the user from')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addStringOption(option =>
                    option.setName('player')
                        .setDescription('Kick user by Username or User ID')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for kicking the player')
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('warn')
                .setDescription('Warn a player in the game')
                .addStringOption(option =>
                    option.setName('server')
                        .setDescription('The name of the Server to ban the user from')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addStringOption(option =>
                    option.setName('player')
                        .setDescription('The player to warn')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for warning the player')
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('ban')
                .setDescription('Ban a player from the game')
                .addStringOption(option =>
                    option.setName('server')
                        .setDescription('The name of the Server to ban the user from')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addStringOption(option =>
                    option.setName('player')
                        .setDescription('The player to ban')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('reason')
                        .setDescription('Reason for banning the player')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('time')
                        .setDescription('Time to ban the user for')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('length')
                        .setDescription('Length of time to ban the user for')
                        .setRequired(true) 
                        .addChoices(
                            { name: 'Minute', value: 'mi' },
                            { name: 'Hour', value: 'hr' },
                            { name: 'Day', value: 'day' },
                            { name: 'Week', value: 'wk' },
                            { name: 'Month', value: 'mo' },
                            { name: 'Year', value: 'yr' },
                        ))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('unban')
                .setDescription('Unban a player from the game')
                .addStringOption(option =>
                    option.setName('server')
                        .setDescription('The name of the Server to ban the user from')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addStringOption(option =>
                    option.setName('player')
                        .setDescription('The player to unban')
                        .setRequired(true))
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const choices = await returnUniverses();

        const filtered = choices.filter((choice) => {
            if (typeof focusedValue === 'string') {
                return choice.name.toLowerCase().startsWith(focusedValue.toLowerCase());
            }
            return false;
        });
        await interaction.respond(filtered.map((choice) => ({ name: choice.name, value: choice.id })));
    },
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'kick') {
            const player = interaction.options.getString('player');
            const reason = interaction.options.getString('reason');
            const server = interaction.options.getString('server');

            const usernameOrId = isNaN(player) ? player : Number(player);
            const logSnowflake = await returnDataKey('logChannel');
            let logChannel = false;

            if (logSnowflake) {
                logChannel = interaction.guild.channels.cache.get(logSnowflake)
            }

            try {
                const settingsCheck = await settingCheck();
                if (!settingsCheck) {
                    const setupEmbed = new EmbedBuilder()
                    .setTitle('Settings Setup: ❌')
                    .setDescription(`Be sure you have configured your API Keys! Run /db `)
                    .setColor('#eb4034')
                    .setTimestamp();
    
                    await interaction.reply({ embeds: [setupEmbed] });
                } else {
                    const isPlayerValid = await validatePlayer(player, usernameOrId);
    
                    if (isPlayerValid.id) {
                        const UserId = isPlayerValid.id;
                        const UserAvatar = await getAvatarUrl(UserId);
    
                        const confirmationEmbed = new EmbedBuilder()
                            .setTitle(`Kick ${player}❓`)
                            .setDescription(`Are you sure you want to kick **${player}**?\n\n**Reason:**\n${reason}`)
                            .setThumbnail(UserAvatar)
                            .setColor('#333333')
                            .setTimestamp();
                        
                        const message = await interaction.reply({ embeds: [confirmationEmbed], fetchReply: true });
                        await message.react('👍');
                        await message.react('👎');
    
                        const filter = (reaction, user) => {
                            return ['👍', '👎'].includes(reaction.emoji.name) && user.id === interaction.user.id;
                        };
    
                        message.awaitReactions({ filter, max: 1, time: 60000, errors: ['time'] })
                            .then(async collected => {
                                const reaction = collected.first();

                                if (reaction.emoji.name === '👍') {
                                    if (message.reactions.cache.size > 0) {
                                        message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                                    }
                                    const data = {
                                        Method: 'Warn',
                                        Message: reason,
                                        Time: null,
                                        Length: null,
                                        Player: isPlayerValid.id,
                                    }

                                    try {
                                        const response = await handleMessageServiceAPI(data, 'DTR', server);
                                        const responseColor = response ? '#00ff44' : '#eb4034';

                                        const responseEmbed = new EmbedBuilder()
                                            .setTitle(`Kick ${response ? 'Successful' : 'Failed'}`)
                                            .addFields({ name: 'Username', value: `${isPlayerValid.name}` })
                                            .addFields({ name: 'User ID', value: `${isPlayerValid.id}` })
                                            .setColor(responseColor)
                                            .setThumbnail(UserAvatar)
                                            .setTimestamp();

                                        if (message) {
                                            message.edit({ embeds: [responseEmbed] });

                                            if (logChannel) {
                                                const logEmbed = new EmbedBuilder()
                                                    .setTitle('Command Executed')
                                                    .addFields({ name: 'Administrator', value: `${interaction.user}` })
                                                    .addFields({ name: 'Action', value: `Kick ${player} ${reason}` })
                                                    .setColor('#eb4034')
                                                    .setThumbnail(interaction.user.displayAvatarURL())
                                                    .setTimestamp();

                                                logChannel.send({ embeds: [logEmbed] })
                                            }
                                        } else {
                                            return console.error('No message object found')
                                        }
                                    } catch (error) {
                                        return console.error(`MessageServ API | ${error}`)
                                    }
                                } else {
                                    if (message.reactions.cache.size > 0) {
                                        message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                                    }
                                    const updatedEmbed = {
                                        title: 'Discord <-> Roblox System',
                                        color: parseInt('00ff44', 16),
                                        fields: [
                                            { name: 'Kick Cancelled', value: 'Cancelled the kick process'}
                                        ]
                                    };

                                    await message.edit({ embeds: [updatedEmbed] });
                                }
                            })
                            .catch(error => {
                                if (error instanceof Collection) {
                                    if (message.reactions.cache.size > 0) {
                                        message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                                    }
                                    const timeoutEmbed = {
                                        title: 'Discord <-> Roblox System',
                                        color: parseInt('00ff44', 16),
                                        fields: [
                                            { name: 'Timeout', value: 'Timed out'}
                                        ]
                                    };
                                    message.edit({ embeds: [timeoutEmbed] });
                                } else {
                                    console.error(`Error awaiting reactions: ${error}`);
                                    interaction.followUp('An error occurred while awaiting reactions.');
                                }
                            });
                    } else if (!isPlayerValid) {
                        await interaction.reply('Unable to find that user on Roblox.');
                    } else {
                        if (!interaction.deferred && !interaction.replied) {
                            await interaction.reply('An error occurred while trying to fetch data from the Roblox API.');
                        }
                    }
                }
            } catch (err) {
                return console.error(`MessageServiceAPI API | ${err}`)
            }
        } else if (subcommand === 'warn') {
            const player = interaction.options.getString('player');
            const reason = interaction.options.getString('reason');
            const server = interaction.options.getString('server');

            const usernameOrId = isNaN(player) ? player : Number(player);
            const logSnowflake = await returnDataKey('logChannel');
            let logChannel = false;

            if (logSnowflake) {
                logChannel = interaction.guild.channels.cache.get(logSnowflake)
            }

            try {
                const settingsCheck = await settingCheck();
                if (!settingsCheck) {
                    const setupEmbed = new EmbedBuilder()
                    .setTitle('Settings Setup: ❌')
                    .setDescription(`Be sure you have configured your API Keys! Run /db `)
                    .setColor('#eb4034')
                    .setTimestamp();
    
                    await interaction.reply({ embeds: [setupEmbed] });
                } else {
                    const isPlayerValid = await validatePlayer(player, usernameOrId);
    
                    if (isPlayerValid.id) {
                        const UserId = isPlayerValid.id;
                        const UserAvatar = await getAvatarUrl(UserId);
    
                        const confirmationEmbed = new EmbedBuilder()
                            .setTitle(`Warn ${player}❓`)
                            .setDescription(`Are you sure you want to warn **${player}**?\n\n**Reason:**\n${reason}`)
                            .setThumbnail(UserAvatar)
                            .setColor('#333333')
                            .setTimestamp();
                        
                        const message = await interaction.reply({ embeds: [confirmationEmbed], fetchReply: true });
                        await message.react('👍');
                        await message.react('👎');
    
                        const filter = (reaction, user) => {
                            return ['👍', '👎'].includes(reaction.emoji.name) && user.id === interaction.user.id;
                        };
    
                        message.awaitReactions({ filter, max: 1, time: 60000, errors: ['time'] })
                            .then(async collected => {
                                const reaction = collected.first();

                                if (reaction.emoji.name === '👍') {
                                    if (message.reactions.cache.size > 0) {
                                        message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                                    }
                                    const data = {
                                        Method: 'Warn',
                                        Message: reason,
                                        Time: null,
                                        Length: null,
                                        Player: isPlayerValid.id,
                                    }
                                    
                                    try {
                                        const response = await handleMessageServiceAPI(data, 'DTR', server);
                                        const responseColor = response ? '#00ff44' : '#eb4034';

                                        const responseEmbed = new EmbedBuilder()
                                            .setTitle(`Warn ${response ? 'Successful' : 'Failed'}`)
                                            .addFields({ name: 'Username', value: `${isPlayerValid.name}` })
                                            .addFields({ name: 'User ID', value: `${isPlayerValid.id}` })
                                            .setColor(responseColor)
                                            .setThumbnail(UserAvatar)
                                            .setTimestamp();

                                        if (message) {
                                            message.edit({ embeds: [responseEmbed] });

                                            if (logChannel) {
                                                const logEmbed = new EmbedBuilder()
                                                    .setTitle('Command Executed')
                                                    .addFields({ name: 'Administrator', value: `${interaction.user}` })
                                                    .addFields({ name: 'Action', value: `Warn ${player} ${reason}` })
                                                    .setColor('#eb4034')
                                                    .setThumbnail(interaction.user.displayAvatarURL())
                                                    .setTimestamp();

                                                logChannel.send({ embeds: [logEmbed] })
                                            }
                                        } else {
                                            return console.error('No message object found')
                                        }
                                    } catch (error) {
                                        return console.error(`MessageServ API | ${error}`)
                                    }
                                } else {
                                    if (message.reactions.cache.size > 0) {
                                        message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                                    }
                                    const updatedEmbed = {
                                        title: 'Discord <-> Roblox System',
                                        color: parseInt('00ff44', 16),
                                        fields: [
                                            { name: 'Warn Cancelled', value: 'Cancelled the warn process'}
                                        ]
                                    };

                                    await message.edit({ embeds: [updatedEmbed] });
                                }
                            })
                            .catch(error => {
                                if (error instanceof Collection) {
                                    if (message.reactions.cache.size > 0) {
                                        message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                                    }
                                    const timeoutEmbed = {
                                        title: 'Discord <-> Roblox System',
                                        color: parseInt('00ff44', 16),
                                        fields: [
                                            { name: 'Timeout', value: 'Timed out'}
                                        ]
                                    };
                                    message.edit({ embeds: [timeoutEmbed] });
                                } else {
                                    console.error(`Error awaiting reactions: ${error}`);
                                    interaction.followUp('An error occurred while awaiting reactions.');
                                }
                            });
                    } else if (!isPlayerValid) {
                        await interaction.reply('Unable to find that user on Roblox.');
                    } else {
                        if (!interaction.deferred && !interaction.replied) {
                            await interaction.reply('An error occurred while trying to fetch data from the Roblox API.');
                        }
                    }
                }
            } catch (err) {
                return console.error(`MessageService API | ${err}`)
            }
        } else if (subcommand === 'ban') {
            const player = interaction.options.getString('player');
            const reason = interaction.options.getString('reason');
            const server = interaction.options.getString('server');
            const TimeToBan = interaction.options.getInteger('time');
            const LengthToBan = interaction.options.getString('length');

            const usernameOrId = isNaN(player) ? player : Number(player);
            const logSnowflake = await returnDataKey('logChannel');
            let logChannel = false;

            if (logSnowflake) {
                logChannel = interaction.guild.channels.cache.get(logSnowflake)
            }

            try {
                const settingsCheck = await settingCheck();
                if (!settingsCheck) {
                    const setupEmbed = new EmbedBuilder()
                    .setTitle('Settings Setup: ❌')
                    .setDescription(`Be sure you have configured your API Keys! Run /db `)
                    .setColor('#eb4034')
                    .setTimestamp();
    
                    await interaction.reply({ embeds: [setupEmbed] });
                } else {
                    const isPlayerValid = await validatePlayer(player, usernameOrId);
    
                    if (isPlayerValid.id) {
                        const UserId = isPlayerValid.id;
                        const UserAvatar = await getAvatarUrl(UserId);
    
                        const confirmationEmbed = new EmbedBuilder()
                            .setTitle(`Ban ${player}❓`)
                            .setDescription(`Are you sure you want to ban **${player}**?\n\n**Reason:**\n${reason}\n\n**Time:**\n${TimeToBan}${LengthToBan}`)
                            .setThumbnail(UserAvatar)
                            .setColor('#333333')
                            .setTimestamp();
                        
                        const message = await interaction.reply({ embeds: [confirmationEmbed], fetchReply: true });
                        await message.react('👍');
                        await message.react('👎');
    
                        const filter = (reaction, user) => {
                            return ['👍', '👎'].includes(reaction.emoji.name) && user.id === interaction.user.id;
                        };
    
                        message.awaitReactions({ filter, max: 1, time: 60000, errors: ['time'] })
                            .then(async collected => {
                                const reaction = collected.first();

                                if (reaction.emoji.name === '👍') {
                                    if (message.reactions.cache.size > 0) {
                                        message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                                    }
                                    const data = {
                                        Method: 'Ban',
                                        Message: reason,
                                        Time: TimeToBan,
                                        Length: LengthToBan,
                                        Player: isPlayerValid.id,
                                        Timestamp: Math.floor(Date.now() / 1000)
                                    }

                                    try {
                                        //const response = await handleMessageServiceAPI(data, 'DTR', server);
                                        const response = await handleDatastoreAPI(isPlayerValid.id, data, server);
                                        const responseColor = response ? '#00ff44' : '#eb4034';

                                        const responseEmbed = new EmbedBuilder()
                                            .setTitle(`Ban ${response ? 'Successful' : 'Failed'}`)
                                            .addFields({ name: 'Username', value: `${isPlayerValid.name}` })
                                            .addFields({ name: 'User ID', value: `${isPlayerValid.id}` })
                                            .setColor(responseColor)
                                            .setThumbnail(UserAvatar)
                                            .setTimestamp();

                                        if (message) {
                                            message.edit({ embeds: [responseEmbed] });

                                            if (logChannel) {
                                                const logEmbed = new EmbedBuilder()
                                                    .setTitle('Command Executed')
                                                    .addFields({ name: 'Administrator', value: `${interaction.user}` })
                                                    .addFields({ name: 'Action', value: `Ban ${player} ${reason} ${TimeToBan}${LengthToBan}` })
                                                    .setColor('#eb4034')
                                                    .setThumbnail(interaction.user.displayAvatarURL())
                                                    .setTimestamp();

                                                logChannel.send({ embeds: [logEmbed] })
                                            }
                                        } else {
                                            return console.error('No message object found')
                                        }
                                    } catch (error) {
                                        return console.error(`Datastore API | ${error}`)
                                    }
                                } else {
                                    if (message.reactions.cache.size > 0) {
                                        message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                                    }
                                    const updatedEmbed = {
                                        title: 'Discord <-> Roblox System',
                                        color: parseInt('00ff44', 16),
                                        fields: [
                                            { name: 'Ban Cancelled', value: 'Cancelled the ban process'}
                                        ]
                                    };

                                    await message.edit({ embeds: [updatedEmbed] });
                                }
                            })
                            .catch(error => {
                                if (error instanceof Collection) {
                                    if (message.reactions.cache.size > 0) {
                                        message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                                    }
                                    const timeoutEmbed = {
                                        title: 'Discord <-> Roblox System',
                                        color: parseInt('00ff44', 16),
                                        fields: [
                                            { name: 'Timeout', value: 'Timed out'}
                                        ]
                                    };
                                    message.edit({ embeds: [timeoutEmbed] });
                                } else {
                                    console.error(`Error awaiting reactions: ${error}`);
                                    interaction.followUp('An error occurred while awaiting reactions.');
                                }
                            });
                    } else if (!isPlayerValid) {
                        await interaction.reply('Unable to find that user on Roblox.');
                    } else {
                        if (!interaction.deferred && !interaction.replied) {
                            await interaction.reply('An error occurred while trying to fetch data from the Roblox API.');
                        }
                    }
                }
            } catch (err) {
                return console.error(`MessageServiceAPI API | ${err}`)
            }
            

        } else if (subcommand === 'unban') {
            const player = interaction.options.getString('player');
            const server = interaction.options.getString('server');

            const usernameOrId = isNaN(player) ? player : Number(player);
            const logSnowflake = await returnDataKey('logChannel');
            let logChannel = false;

            if (logSnowflake) {
                logChannel = interaction.guild.channels.cache.get(logSnowflake)
            }

            try {
                const settingsCheck = await settingCheck();
                if (!settingsCheck) {
                    const setupEmbed = new EmbedBuilder()
                    .setTitle('Settings Setup: ❌')
                    .setDescription(`Be sure you have configured your API Keys! Run /db `)
                    .setColor('#eb4034')
                    .setTimestamp();
    
                    await interaction.reply({ embeds: [setupEmbed] });
                } else {
                    const isPlayerValid = await validatePlayer(player, usernameOrId);
    
                    if (isPlayerValid.id) {
                        const UserId = isPlayerValid.id;
                        const UserAvatar = await getAvatarUrl(UserId);
    
                        const confirmationEmbed = new EmbedBuilder()
                            .setTitle(`Unban ${player}❓`)
                            .setDescription(`Are you sure you want to unban **${player}**?`)
                            .setThumbnail(UserAvatar)
                            .setColor('#333333')
                            .setTimestamp();
                        
                        const message = await interaction.reply({ embeds: [confirmationEmbed], fetchReply: true });
                        await message.react('👍');
                        await message.react('👎');
    
                        const filter = (reaction, user) => {
                            return ['👍', '👎'].includes(reaction.emoji.name) && user.id === interaction.user.id;
                        };
    
                        message.awaitReactions({ filter, max: 1, time: 60000, errors: ['time'] })
                            .then(async collected => {
                                const reaction = collected.first();

                                if (reaction.emoji.name === '👍') {
                                    if (message.reactions.cache.size > 0) {
                                        message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                                    }
                                    const data = {
                                        Method: "Unban",
                                        Message: null,
                                        Time: null,
                                        Length: null,
                                        Player: isPlayerValid.id
                                    }

                                    try {
                                        //const response = await handleMessageServiceAPI(data, 'DTR', server);
                                        const response = await handleDatastoreAPI(isPlayerValid.id, data, server);
                                        const responseColor = response ? '#00ff44' : '#eb4034';

                                        const responseEmbed = new EmbedBuilder()
                                            .setTitle(`Unban ${response ? 'Successful' : 'Failed'}`)
                                            .addFields({ name: 'Username', value: `${isPlayerValid.name}` })
                                            .addFields({ name: 'User ID', value: `${isPlayerValid.id}` })
                                            .setColor(responseColor)
                                            .setThumbnail(UserAvatar)
                                            .setTimestamp();

                                        if (message) {
                                            message.edit({ embeds: [responseEmbed] });

                                            if (logChannel) {
                                                const logEmbed = new EmbedBuilder()
                                                    .setTitle('Command Executed')
                                                    .addFields({ name: 'Administrator', value: `${interaction.user}` })
                                                    .addFields({ name: 'Action', value: `Unban ${server} ${player}` })
                                                    .setColor('#eb4034')
                                                    .setThumbnail(interaction.user.displayAvatarURL())
                                                    .setTimestamp();

                                                logChannel.send({ embeds: [logEmbed] })
                                            }
                                        } else {
                                            return console.error('No message object found')
                                        }
                                    } catch (error) {
                                        return console.error(`Datastore API | ${error}`)
                                    }
                                } else {
                                    if (message.reactions.cache.size > 0) {
                                        message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                                    }
                                    const updatedEmbed = {
                                        title: 'Discord <-> Roblox System',
                                        color: parseInt('00ff44', 16),
                                        fields: [
                                            { name: 'Unban Cancelled', value: 'Cancelled the unban process'}
                                        ]
                                    };

                                    await message.edit({ embeds: [updatedEmbed] });
                                }
                            })
                            .catch(error => {
                                if (error instanceof Collection) {
                                    if (message.reactions.cache.size > 0) {
                                        message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                                    }
                                    const timeoutEmbed = {
                                        title: 'Discord <-> Roblox System',
                                        color: parseInt('00ff44', 16),
                                        fields: [
                                            { name: 'Timeout', value: 'Timed out'}
                                        ]
                                    };
                                    message.edit({ embeds: [timeoutEmbed] });
                                } else {
                                    console.error(`Error awaiting reactions: ${error}`);
                                    interaction.followUp('An error occurred while awaiting reactions.');
                                }
                            });
                    } else if (!isPlayerValid) {
                        await interaction.reply('Unable to find that user on Roblox.');
                    } else {
                        if (!interaction.deferred && !interaction.replied) {
                            await interaction.reply('An error occurred while trying to fetch data from the Roblox API.');
                        }
                    }
                }
            } catch (err) {
                return console.error(`MessageServiceAPI API | ${err}`)
            }
        }
    }
};
