export interface Voice {
  id: string;
  name: string;
  description: string;
}

export const VOICES: Voice[] = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", description: "女声 · 自然清晰" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", description: "男声 · 温和专业" },
  { id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte", description: "女声 · 活力商业" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", description: "女声 · 亲切口播" },
];

export const DEFAULT_VOICE_ID = VOICES[0].id;

export const EXAMPLE_TEXT =
  "还在为割草头疼吗？太阳底下忙活大半天，又累又费劲儿，清理碎草还麻烦！给你推荐这个懒人神器：全自动割草机器人，不用看管、不用拉线，放院子里它自己就能干活，避障又安全，碰到台阶、障碍物自动避让，老人小孩宠物在旁边也放心，没电了自己回桩充电，剪的草坪均匀平整，比人工还好看，解放双手，不用再为割草浪费时间，轻松拥有整洁庭院，闭眼入不踩雷。";
