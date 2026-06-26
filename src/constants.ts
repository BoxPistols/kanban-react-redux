// Time constants
export const ONE_DAY_MS = 86400000 // 24 hours in milliseconds

// Board color palette (多様な色相 - 視認性と識別性を重視)
export const BOARD_COLORS = [
    '#3182CE', // 青 Blue
    '#38A169', // 緑 Green
    '#DD6B20', // オレンジ Orange
    '#E53E3E', // 赤 Red
    '#805AD5', // 紫 Purple
    '#D69E2E', // 黄 Gold
    '#EC4899', // ピンク Pink
    '#06B6D4', // シアン Cyan
    '#84CC16', // ライム Lime
    '#10B981', // エメラルド Emerald
]

// Label color palette (vivid jewel tones for readability)
export const LABEL_COLORS = [
    '#D69E2E', // Gold (Life用)
    '#38A169', // Emerald (Dev用)
    '#E53E3E', // Ruby (Imp用)
    '#3182CE', // Sapphire (Study用)
    '#805AD5', // Amethyst (Per用)
    '#DD6B20', // Amber (KSD用 - より濃いオレンジ)
    '#718096', // Slate (Other用)
    '#D53F8C', // Rose (Fun用)
]

// Card color palette (ラベルと完全一致のため、LABEL_COLORSを参照)
export const CARD_COLORS = LABEL_COLORS

// Card color labels (各色の意味づけ)
export const CARD_COLOR_LABELS = [
    { color: '#D69E2E', name: 'ゴールド', description: 'Life用' },
    { color: '#38A169', name: 'エメラルド', description: 'Dev用' },
    { color: '#E53E3E', name: 'ルビー', description: 'Imp用' },
    { color: '#3182CE', name: 'サファイア', description: 'Study用' },
    { color: '#805AD5', name: 'アメジスト', description: 'Per用' },
    { color: '#DD6B20', name: 'アンバー', description: 'KSD用' },
    { color: '#718096', name: 'スレート', description: 'Other用' },
    { color: '#D53F8C', name: 'ローズ', description: 'Fun用' },
]
