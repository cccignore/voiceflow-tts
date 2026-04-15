import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const config = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    ignores: [
      ".agents/**",
      "**/.agents/**",
      ".claude/**",
      "DEPLOY_VERCEL_ALIYUN.md",
      "PLAN.md",
      "TODO.md",
    ],
  },
];

export default config;
