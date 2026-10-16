import type { MenuItemId } from '../../lib/menu-shared';

// --- MBTI PERSONALIZED RECOMMENDATIONS ---
export const MBTI_DESSERT_MAPPING: Record<string, { personality: string; recommendedItemIds: MenuItemId[]; reason: string }> = {
  INTJ: {
    personality: "建築師 · 睿智巴斯貓",
    recommendedItemIds: ['tiramisu_matcha', 'basque_classic', 'mille_crepe_classic'],
    reason: "你追求完美與深度，這些甜點層次豐富卻不過分張揚。"
  },
  INTP: {
    personality: "邏輯學家 · 睿智巴斯貓",
    recommendedItemIds: ['tiramisu_yuzu_apple_cheese', 'tiramisu_pudding_mocha', 'basque_honey_black_tea'],
    reason: "你喜歡探索新組合，這些創新口味會激發你的好奇心。"
  },
  ENTJ: {
    personality: "指揮官 · 睿智巴斯貓",
    recommendedItemIds: ['tiramisu_classic', 'tiramisu_baileys', 'mille_crepe_classic'],
    reason: "你喜歡經典且有影響力的選擇，這些甜點強勁而直接。"
  },
  ENTP: {
    personality: "辯論家 · 睿智巴斯貓",
    recommendedItemIds: ['tiramisu_yuzu_apple_cheese', 'tiramisu_baileys', 'tiramisu_matcha'],
    reason: "你熱愛挑戰常規，這些創新口味符合你的冒險精神。"
  },
  INFJ: {
    personality: "提倡者 · 夢幻蛋鬼",
    recommendedItemIds: ['tiramisu_matcha', 'basque_honey_black_tea', 'pudding_classic'],
    reason: "你重視內在與意義，這些甜點含蓄而深刻。"
  },
  INFP: {
    personality: "調停者 · 夢夢幻蛋鬼",
    recommendedItemIds: ['pudding_classic', 'tiramisu_yuzu_apple_cheese', 'basque_honey_black_tea'],
    reason: "你的溫柔需要同樣溫暖的甜點來呼應。"
  },
  ENFJ: {
    personality: "主人公 · 夢幻蛋鬼",
    recommendedItemIds: ['tiramisu_classic', 'tiramisu_yuzu_apple_cheese', 'basque_classic'],
    reason: "你熱愛分享與連結，這些甜點適合與人共享。"
  },
  ENFP: {
    personality: "競選者 · 活力奇異鳥",
    recommendedItemIds: ['tiramisu_yuzu_apple_cheese', 'mille_crepe_classic', 'tiramisu_baileys'],
    reason: "你的自由精神需要同樣有趣的甜點來搭配。"
  },
  ISTJ: {
    personality: "物流師 · 活力奇異鳥",
    recommendedItemIds: ['tiramisu_classic', 'basque_classic', 'pudding_classic'],
    reason: "你信賴經典，這些傳統甜點經得起時間考驗。"
  },
  ISFJ: {
    personality: "守衛者 · 活力奇異鳥",
    recommendedItemIds: ['pudding_classic', 'basque_honey_black_tea', 'tiramisu_classic'],
    reason: "你的細心值得同樣用心製作的甜點。"
  },
  ESTJ: {
    personality: "總經理 · 活力奇異鳥",
    recommendedItemIds: ['tiramisu_classic', 'basque_classic', 'mille_crepe_classic'],
    reason: "你重視效率與品質，這些經典款值得信賴。"
  },
  ESFJ: {
    personality: "執政官 · 活力奇異鳥",
    recommendedItemIds: ['tiramisu_classic', 'basque_classic', 'tiramisu_pudding_mocha'],
    reason: "你善於照顧他人，這些甜點適合與朋友分享。"
  },
  ISTP: {
    personality: "鑑賞家 · 睿智巴斯貓",
    recommendedItemIds: ['tiramisu_baileys', 'tiramisu_yuzu_apple_cheese', 'mille_crepe_classic'],
    reason: "你喜歡探索新事物，這些口味會帶來驚喜。"
  },
  ISFP: {
    personality: "探險家 · 夢幻蛋鬼",
    recommendedItemIds: ['tiramisu_matcha', 'tiramisu_yuzu_apple_cheese', 'basque_honey_black_tea'],
    reason: "你的藝術靈魂需要同樣美麗的甜點。"
  },
  ESTP: {
    personality: "企業家 · 睿智巴斯貓",
    recommendedItemIds: ['tiramisu_baileys', 'tiramisu_classic', 'tiramisu_yuzu_apple_cheese'],
    reason: "你的能量需要同樣強勁的甜點來匹配。"
  },
  ESFP: {
    personality: "表演者 · 活力奇異鳥",
    recommendedItemIds: ['tiramisu_yuzu_apple_cheese', 'tiramisu_classic', 'tiramisu_baileys'],
    reason: "你的熱情需要同樣歡樂的甜點來慶祝。"
  }
};
