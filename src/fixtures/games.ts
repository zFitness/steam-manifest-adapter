/** Temporary fake data — see ./README.md. Delete with the domain layer. */

/** Per-game adaptability, mapped to the four `status.*` labels. */
export type GameStatus =
  | 'adaptable'
  | 'alreadyAdapted'
  | 'needsAttention'
  | 'notAdaptable';

export type FixtureGame = {
  id: string;
  name: string;
  appId: string;
  installDir: string;
  status: GameStatus;
};

export const FIXTURE_DIRECTORY = '/storage/emulated/0/Games/SteamLibrary/steamapps';

export const FIXTURE_GAMES: FixtureGame[] = [
  { id: '620', name: 'Portal 2', appId: '620', installDir: 'Portal 2', status: 'adaptable' },
  { id: '440', name: 'Team Fortress 2', appId: '440', installDir: 'Team Fortress 2', status: 'adaptable' },
  { id: '570', name: 'Dota 2', appId: '570', installDir: 'dota 2 beta', status: 'adaptable' },
  { id: '4000', name: "Garry's Mod", appId: '4000', installDir: 'GarrysMod', status: 'needsAttention' },
  { id: '730', name: 'Counter-Strike 2', appId: '730', installDir: 'Counter-Strike Global Offensive', status: 'alreadyAdapted' },
  { id: '292030', name: 'The Witcher 3: Wild Hunt', appId: '292030', installDir: 'The Witcher 3', status: 'notAdaptable' },
  { id: '1091500', name: 'Cyberpunk 2077', appId: '1091500', installDir: 'Cyberpunk 2077', status: 'adaptable' },
  { id: '271590', name: 'Grand Theft Auto V', appId: '271590', installDir: 'Grand Theft Auto V', status: 'needsAttention' },
  { id: '236850', name: 'Europa Universalis IV', appId: '236850', installDir: 'Europa Universalis IV', status: 'adaptable' },
  { id: '294100', name: 'RimWorld', appId: '294100', installDir: 'RimWorld', status: 'adaptable' },
  { id: '105600', name: 'Terraria', appId: '105600', installDir: 'Terraria', status: 'alreadyAdapted' },
  { id: '413150', name: 'Stardew Valley', appId: '413150', installDir: 'Stardew Valley', status: 'adaptable' },
  { id: '322330', name: "Don't Starve Together", appId: '322330', installDir: 'Dont Starve Together', status: 'adaptable' },
  { id: '252490', name: 'Rust', appId: '252490', installDir: 'Rust', status: 'notAdaptable' },
  { id: '1145360', name: 'Hades', appId: '1145360', installDir: 'Hades', status: 'adaptable' },
  { id: '1174180', name: 'Red Dead Redemption 2', appId: '1174180', installDir: 'Red Dead Redemption 2', status: 'needsAttention' },
  { id: '553850', name: 'HELLDIVERS 2', appId: '553850', installDir: 'Helldivers 2', status: 'adaptable' },
  { id: '1086940', name: "Baldur's Gate 3", appId: '1086940', installDir: 'Baldurs Gate 3', status: 'adaptable' },
  { id: '1245620', name: 'ELDEN RING', appId: '1245620', installDir: 'ELDEN RING', status: 'adaptable' },
  { id: '275850', name: "No Man's Sky", appId: '275850', installDir: 'No Mans Sky', status: 'alreadyAdapted' },
];

/** A game may only be selected for conversion when it is not `notAdaptable`. */
export function isSelectable(game: FixtureGame): boolean {
  return game.status !== 'notAdaptable';
}

/** Only `adaptable` games are ticked by default. */
export function isDefaultSelected(game: FixtureGame): boolean {
  return game.status === 'adaptable';
}
