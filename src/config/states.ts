import type { MenuItemId } from '../../lib/menu-shared';

// --- DATA: 狀態與任務 ---
export const STATE_DATA: Record<string, {
  title: string;
  advice: string;
  mission: string;
  recommendedItemIds: MenuItemId[];
}> = {
  noon: {
    title: "光剛落進來 / 12:00",
    advice: "窗邊剛亮起來，綠色還很安靜。先讓眼睛停一下，再想今天想吃什麼。",
    mission: "找一個有光的位置，替今天留一小塊空白。",
    recommendedItemIds: ['basque_classic', 'tiramisu_yuzu_apple_cheese', 'mille_crepe_classic']
  },
  open: {
    title: "沿著綠光走 / 13:00",
    advice: "門開了，甜點與葉影一起醒來。順著光走，不需要急著決定目的地。",
    mission: "慢一點進門，看看今天第一個吸引你的角落。",
    recommendedItemIds: ['tiramisu_classic', 'mille_crepe_classic', 'basque_honey_black_tea']
  },
  three: {
    title: "葉影最深 / 15:00",
    advice: "光穿過葉片，留下深深淺淺的影子。你也可以暫時不用把事情看得太清楚。",
    mission: "選一份有層次的甜點，慢慢吃到心裡安靜下來。",
    recommendedItemIds: ['pudding_classic', 'tiramisu_pudding_mocha', 'mille_crepe_matcha']
  },
  golden: {
    title: "窗邊變金 / 17:00",
    advice: "綠色裡多了一點金。今天不必重新開始，只要在這裡接住剩下的光。",
    mission: "看一眼窗邊，把今天值得留下的片刻記住。",
    recommendedItemIds: ['tiramisu_baileys', 'basque_classic', 'tiramisu_matcha']
  },
  closing: {
    title: "在甜點旁停下 / 18:00",
    advice: "路走到這裡，不需要再趕。讓一份甜點替今天收尾，讓自己停在剛好的地方。",
    mission: "帶一份甜點回家，也把這段綠光帶走。",
    recommendedItemIds: ['tiramisu_classic', 'pudding_classic', 'basque_honey_black_tea']
  }
};
