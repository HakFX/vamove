const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { removeUniverse, returnUniverses, saveSetting, saveUniverse } = require('../API/mainAPI');
const unbanModal = require('../Modals/unbanModal.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('Access settings')
        .addSubcommand(subcommand =>
            subcommand
                .setName('db')
                .setDescription('Configure database settings')
                .addStringOption(option =>
                    option.setName('datastore-key')
                        .setDescription('Set Datastore API key')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('msgserv-key')
                        .setDescription('Set Datastore API key')
                        .setRequired(false))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('add-universe')
                .setDescription('Add a universe to the database')
                .addStringOption(option =>
                    option.setName('universe-name')
                        .setDescription('Name of the universe')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('universe-id')
                        .setDescription('ID of the universe')
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove-universe')
                .setDescription('Removes a universe from the database')
                .addStringOption(option =>
                    option.setName('universe-toremove')
                        .setDescription('Name/ID of the universe')
                        .setRequired(true)
                        .setAutocomplete(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list-universe')
                .setDescription('Lists all universes from the database')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('logging')
                .setDescription('Configure logging settings')
                .addChannelOption(option =>
                    option.setName('logging-channel') // channel
                    .setDescription('Set the logging channel for moderation actions')
                    .setRequired(false))
                .addChannelOption(option =>
                    option.setName('application-channel') // channel
                    .setDescription('Set the application results channel')
                    .setRequired(false))
                .addChannelOption(option =>
                    option.setName('appeal-channel') // channel
                    .setDescription('Channel to send the appeal application')
                    .setRequired(false))
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

            if (subcommand === 'db') {
                const datastoreKey = interaction.options.getString('datastore-key');
                const msgServKey = interaction.options.getString('msgserv-key')

                if (datastoreKey) {
                    let toSave = await saveSetting('datastoreAPIKey', datastoreKey)

                    if (toSave.status === 'Saved') {
                        const savedEmbed = new EmbedBuilder()
                            .setTitle('Setting Saved')
                            .setDescription(`Saved **DataStore Key** to the database`)
                            .setColor('#2f3136')
                            .addFields(
                                { name: 'Setting', value: toSave.settingName },
                                { name: 'Value', value: toSave.settingValue }
                            )
                            .setTimestamp();

                        await interaction.reply({ embeds: [savedEmbed], ephemeral: true });
                    } else if (toSave.status === 'Overwrite') {
                        const overwriteEmbed = new EmbedBuilder()
                            .setTitle('Setting Overwritten')
                            .setDescription(`Overwrote Settings in database`)
                            .setColor('#2f3136')
                            .addFields(
                                { name: 'Setting', value: toSave.settingName },
                                { name: 'New Value', value: toSave.settingValue}
                            )
                            .setTimestamp();

                        await interaction.reply({ embeds: [overwriteEmbed], ephemeral: true });
                    }
                }

                if (msgServKey) {
                    let toSave = await saveSetting('msgServAPIKey', msgServKey)

                    if (toSave.status === 'Saved') {
                        const savedEmbed = new EmbedBuilder()
                            .setTitle('Setting Saved')
                            .setDescription(`Saved **MSGService Key** to the database`)
                            .setColor('#2f3136')
                            .addFields(
                                { name: 'Setting', value: toSave.settingName },
                                { name: 'Value', value: toSave.settingValue }
                            )
                            .setTimestamp();

                        await interaction.reply({ embeds: [savedEmbed], ephemeral: true });
                    } else if (toSave.status === 'Overwrite') {
                        const overwriteEmbed = new EmbedBuilder()
                            .setTitle('Setting Overwritten')
                            .setDescription(`Overwrote Settings in database`)
                            .setColor('#2f3136')
                            .addFields(
                                { name: 'Setting', value: toSave.settingName },
                                { name: 'New Value', value: toSave.settingValue}
                            )
                            .setTimestamp();

                        await interaction.reply({ embeds: [overwriteEmbed], ephemeral: true });
                    }
                }
            } else if (subcommand === 'add-universe') {
                const universeName = interaction.options.getString('universe-name');
                const universeID = interaction.options.getString('universe-id');

                let Save = await saveUniverse(universeName, universeID);

                if (Save) {
                    const addedEmbed = new EmbedBuilder()
                        .setTitle('✔️ Universe Added')
                        .setDescription(`Added **${universeName}** to the database`)
                        .setColor('#5dca83')
                        .addFields(
                            { name: 'Name', value: universeName, inline: true },
                            { name: 'ID', value: universeID, inline: true },
                        )
                        .setTimestamp();

                    await interaction.reply({ embeds: [addedEmbed] });    
                } else if (!Save.status) {
                    const existsEmbed = new EmbedBuilder()
                        .setTitle('Universe Exits')
                        .setDescription(Save.reason)
                        .setColor('#eb4034')
                        .setTimestamp();

                    await interaction.reply({ embeds: [existsEmbed] });
                }
            } else if (subcommand === 'logging') {
                const logChannelOption = interaction.options.getChannel('logging-channel');
                const applicationChannelOption = interaction.options.getChannel('application-channel');
                const appealChannelOption = interaction.options.getChannel('appeal-channel');

                let response = 'Logging settings updated:';
                const logEmbed = new EmbedBuilder()
                .setTitle('Logging Settings Updated!')
                .setColor('#5dca83')
                .setTimestamp();

                if (logChannelOption) {
                    response += `\nLogging channel: ${logChannelOption.toString()}`;
                    await saveSetting('logChannel', logChannelOption.id);
                }

                if (applicationChannelOption) {
                    response += `\nApplication channel: ${applicationChannelOption.toString()}`;
                    await saveSetting('applicationChannel', applicationChannelOption.id);
                }

                if (appealChannelOption) {
                    response += `\nAppeal channel: ${appealChannelOption.toString()}`;
                    await saveSetting('appealChannel', appealChannelOption.id);
                    
                    if (!interaction.deferred) {
                        await unbanModal.execute(interaction);
                    }
                }

                logEmbed.setDescription(response);
                if (!interaction.deferred) {
                    await interaction.reply({ embeds: [logEmbed] });
                }
            } else if (subcommand === 'list-universe') {
                let universes = await returnUniverses();
                
                if (universes.length == 0) {
                    const emptyEmbed = new EmbedBuilder()
                    .setTitle('Universes')
                    .setDescription('No universes found')
                    .setColor('#eb4034')
                    .setTimestamp();

                    await interaction.reply({ embeds: [emptyEmbed] })
                }
                const universeEmbed = new EmbedBuilder()
                    .setTitle('Universes')
                    .setDescription('List of all universes')
                    .setColor('#5dca83')
                    .addFields(
                        { name: 'Name', value: universes.map((universe) => '➡ ' + universe.name).join('\n'), inline: true },
                        { name: 'ID', value: universes.map((universe) => universe.id).join('\n'), inline: true },
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [universeEmbed] });
            } else if (subcommand === 'remove-universe') {
                const universe = interaction.options.getString('universe-toremove');
                let check = await removeUniverse(universe);

                if (check) {
                    const removedEmbed = new EmbedBuilder()
                        .setTitle('✅ Setting Removed')
                        .setDescription(`Setting: **${check.Name}** with ID: **${check.ID}** has been removed`)
                        .setColor('#5dca83')
                    
                    await interaction.reply({ embeds: [removedEmbed], ephemeral: true });
                } else {
                    const noMatchEmbed = new EmbedBuilder()
                        .setTitle('❌ Settings')
                        .setDescription(`Setting with Name/ID: **${universe}** does not exist`)
                        .setColor('#ad4242')
                        .setTimestamp();

                    await interaction.reply({ embeds: [noMatchEmbed] });
                }
            }
        }
}