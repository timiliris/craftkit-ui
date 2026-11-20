// What scripts/extract-textures.mjs pulls out of your Minecraft client jar.
// All paths are relative to assets/minecraft/textures/ inside the jar.

/** Copied as plain files to public/minecraft/textures/ (served at /minecraft/textures/...). */
export const COPY = [
  /^gui\/sprites\//,
  /^gui\/[^/]+\.png$/,
  /^gui\/container\//,
  /^gui\/advancements\//,
  /^block\//,
  /^item\//,
  /^mob_effect\//,
  /^painting\//,
  /^particle\//,
  /^environment\/celestial\//,
  /^misc\/enchanted_glint_item\.png/,
]

/** Never extracted: logos and trademarks (do not make a site look like an official Mojang product). */
export const EXCLUDE = [/^gui\/title\//, /^gui\/realms\//, /^gui\/presets\//]

/**
 * Inlined as data-URI CSS variables in src/styles/minecraft-textures.css so the theme
 * works as a single portable stylesheet. Variable name = --mc- + path without the
 * "gui/sprites/" prefix, "/" and "_" become "-".
 *   gui/sprites/widget/button_highlighted.png -> --mc-widget-button-highlighted
 *   gui/menu_background.png                   -> --mc-gui-menu-background
 *   block/dirt.png                            -> --mc-block-dirt
 */
export const INLINE = [
  /^gui\/sprites\/widget\//,
  /^gui\/sprites\/tooltip\//,
  /^gui\/sprites\/popup\//,
  /^gui\/sprites\/toast\//,
  /^gui\/sprites\/dialog\//,
  /^gui\/sprites\/notification\//,
  /^gui\/sprites\/icon\//,
  /^gui\/sprites\/boss_bar\//,
  /^gui\/sprites\/container\/[^/]+$/,
  /^gui\/sprites\/container\/creative_inventory\/(scroller|scroller_disabled|tab_top_selected_1|tab_top_unselected_1)\.png/,
  /^gui\/sprites\/container\/(furnace|villager|enchanting_table|beacon|anvil)\//,
  /^gui\/sprites\/hud\/[^/]+$/,
  /^gui\/sprites\/hud\/heart\/(container|container_hardcore|full|half|hardcore_full|hardcore_half|poisoned_full|poisoned_half|withered_full|withered_half|absorbing_full|absorbing_half|frozen_full|frozen_half)\.png/,
  /^gui\/sprites\/advancements\//,
  /^gui\/sprites\/recipe_book\//,
  /^gui\/sprites\/server_list\//,
  /^gui\/sprites\/world_list\//,
  /^gui\/sprites\/transferable_list\//,
  /^gui\/sprites\/statistics\//,
  /^gui\/sprites\/player_list\//,
  /^gui\/sprites\/pause_menu\//,
  /^gui\/sprites\/spectator\//,
  /^gui\/(menu_background|menu_list_background|inworld_menu_background|inworld_menu_list_background|header_separator|footer_separator|inworld_header_separator|inworld_footer_separator|tab_header_background)\.png/,
  /^gui\/advancements\/backgrounds\//,
]

/** Block textures inlined as --mc-block-<name>. Every other block stays available as a file. */
export const INLINE_BLOCKS = [
  "dirt", "coarse_dirt", "grass_block_side", "grass_block_top", "podzol_top", "mud", "mud_bricks",
  "stone", "cobblestone", "mossy_cobblestone", "stone_bricks", "mossy_stone_bricks", "cracked_stone_bricks",
  "smooth_stone", "andesite", "polished_andesite", "diorite", "granite", "calcite", "tuff", "tuff_bricks",
  "deepslate", "cobbled_deepslate", "polished_deepslate", "deepslate_bricks", "deepslate_tiles",
  "bedrock", "gravel", "sand", "red_sand", "sandstone", "clay", "bricks",
  "oak_planks", "spruce_planks", "birch_planks", "jungle_planks", "acacia_planks", "dark_oak_planks",
  "mangrove_planks", "cherry_planks", "bamboo_planks", "crimson_planks", "warped_planks", "pale_oak_planks",
  "oak_log", "oak_log_top", "spruce_log", "birch_log", "bookshelf", "crafting_table_front", "crafting_table_top",
  "furnace_front", "chiseled_bookshelf_empty", "barrel_side", "tnt_side", "hay_block_side", "note_block",
  "obsidian", "crying_obsidian", "netherrack", "nether_bricks", "blackstone", "polished_blackstone_bricks",
  "basalt_side", "soul_sand", "glowstone", "magma", "end_stone", "end_stone_bricks", "purpur_block",
  "snow", "ice", "packed_ice", "blue_ice", "glass", "tinted_glass",
  "coal_ore", "iron_ore", "copper_ore", "gold_ore", "redstone_ore", "lapis_ore", "diamond_ore", "emerald_ore",
  "deepslate_diamond_ore", "deepslate_emerald_ore", "deepslate_redstone_ore", "deepslate_gold_ore",
  "coal_block", "iron_block", "copper_block", "gold_block", "redstone_block", "lapis_block", "diamond_block",
  "emerald_block", "netherite_block", "amethyst_block", "quartz_block_side", "prismarine_bricks", "dark_prismarine",
  "sculk", "moss_block", "honeycomb_block", "terracotta",
  "white_wool", "light_gray_wool", "gray_wool", "black_wool", "red_wool", "orange_wool", "yellow_wool",
  "lime_wool", "green_wool", "cyan_wool", "light_blue_wool", "blue_wool", "purple_wool", "magenta_wool", "pink_wool", "brown_wool",
  "white_concrete", "light_gray_concrete", "gray_concrete", "black_concrete", "red_concrete", "orange_concrete",
  "yellow_concrete", "lime_concrete", "green_concrete", "cyan_concrete", "light_blue_concrete", "blue_concrete",
  "purple_concrete", "magenta_concrete", "pink_concrete", "brown_concrete",
]

/** Item textures inlined as --mc-item-<name>. Every other item stays available as a file. */
export const INLINE_ITEMS = [
  "diamond", "emerald", "gold_ingot", "iron_ingot", "copper_ingot", "netherite_ingot", "redstone", "lapis_lazuli",
  "coal", "amethyst_shard", "quartz", "gold_nugget", "stick", "string", "feather", "flint", "leather", "bone",
  "wooden_sword", "stone_sword", "iron_sword", "golden_sword", "diamond_sword", "netherite_sword",
  "wooden_pickaxe", "stone_pickaxe", "iron_pickaxe", "golden_pickaxe", "diamond_pickaxe", "netherite_pickaxe",
  "diamond_axe", "diamond_shovel", "diamond_hoe", "bow", "arrow", "crossbow_standby", "trident", "mace", "shears",
  "fishing_rod", "flint_and_steel", "spyglass", "brush",
  "diamond_helmet", "diamond_chestplate", "diamond_leggings", "diamond_boots", "elytra", "totem_of_undying",
  "apple", "golden_apple", "bread", "cooked_beef", "cooked_chicken", "carrot", "golden_carrot", "cookie", "cake",
  "pumpkin_pie", "melon_slice", "sweet_berries", "honey_bottle", "milk_bucket",
  "book", "writable_book", "written_book", "enchanted_book", "knowledge_book", "paper", "map", "filled_map",
  "name_tag", "bundle", "compass_00", "clock_00", "recovery_compass_00", "lead", "saddle",
  "bucket", "water_bucket", "lava_bucket", "powder_snow_bucket", "glass_bottle", "experience_bottle", "potion", "potion_overlay",
  "ender_pearl", "ender_eye", "nether_star", "blaze_rod", "blaze_powder", "ghast_tear", "slime_ball", "gunpowder",
  "glowstone_dust", "heart_of_the_sea", "nautilus_shell", "echo_shard", "dragon_breath", "end_crystal", "firework_rocket",
  "wheat", "wheat_seeds", "egg", "snowball", "bone_meal", "sugar", "ink_sac", "glow_ink_sac",
  "oak_sign", "oak_door", "iron_door", "minecart", "oak_boat", "bell", "lantern", "campfire", "barrier",
  "music_disc_13", "music_disc_cat", "music_disc_pigstep", "painting", "item_frame", "armor_stand",
]
