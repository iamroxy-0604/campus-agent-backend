// utils/dialogData.js
export const gymDialogDB = {
    coach: {
        name: "体育馆管理员",
        lines: [
            "嘿，来锻炼身体吗？",
            { input: true, placeholder: "你想问什么？", defaultValue: "" },
            { agent: "gym_admin", question: "{userInput}" }
        ]
    }
};

export const mcdDialogDB = {
    cashier: {
        name: "麦当劳餐厅服务员",
        lines: [
            "同学你好，欢迎光临麦当劳！🍔",
            { input: true, placeholder: "请问你想点什么？", defaultValue: "巨无霸" },
            { agent: "mcd_manager", question: "{userInput}" }
        ]
    }
};

export const officeDialogDB = {
    secretary: {
        name: "陈院长",
        lines: [
            "同学，学业还顺利吗？",
            { input: true, placeholder: "请回答", defaultValue: "顺利" },
            { agent: "dean_chen", question: "{userInput}" }
        ]
    }
};