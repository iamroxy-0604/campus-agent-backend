// scenes/BulletinScene.js
import * as Phaser from 'phaser';

// 演示公告数据（后续可接入后端 API）
const DEMO_ANNOUNCEMENTS = [
    {
        id: 1,
        title: '关于校园网络维护的通知',
        date: '2026-07-08',
        type: '系统通知',
        content: '校园网络将于7月10日凌晨2:00-6:00进行升级维护，届时校园WiFi及有线网络将暂停服务。请同学们提前做好安排，如有问题请联系网络中心。',
        color: '#4fc3f7'  // 蓝色
    },
    {
        id: 2,
        title: '二手交易平台即将上线',
        date: '2026-07-07',
        type: '平台公告',
        content: '校园智能体即将推出二手交易功能！同学们可以在平台上发布闲置物品、浏览商品、在线沟通。敬请期待！',
        color: '#81c784'  // 绿色
    },
    {
        id: 3,
        title: '暑期体育馆开放时间调整',
        date: '2026-07-06',
        type: '场馆通知',
        content: '暑假期间（7月15日-8月31日），体育馆开放时间调整为每日14:00-20:00。羽毛球场和篮球场正常开放，游泳池暂停使用。',
        color: '#ffb74d'  // 橙色
    },
    {
        id: 4,
        title: '校园卡充值优惠活动',
        date: '2026-07-05',
        type: '优惠活动',
        content: '即日起至7月30日，使用校园卡在麦当劳消费满30元立减5元，每日限前100名。体育馆场地预约也享8折优惠！赶快行动吧~',
        color: '#ef5350'  // 红色
    },
    {
        id: 5,
        title: '寻找校园好声音 — 歌手大赛报名',
        date: '2026-07-04',
        type: '活动通知',
        content: '2026年校园歌手大赛开始报名啦！初赛时间：7月20日，决赛时间：7月28日。报名方式：学生活动中心前台或扫描海报二维码。一等奖可获得蓝牙耳机一副！',
        color: '#ce93d8'  // 紫色
    },
    {
        id: 6,
        title: '图书馆暑期借阅规则变更',
        date: '2026-07-03',
        type: '系统通知',
        content: '暑假期间，图书馆借阅期限由30天延长至60天。已借图书自动延期，无需单独办理。暑期推荐书单已在一楼大厅展示，欢迎同学们借阅。',
        color: '#4fc3f7'
    }
];

export class BulletinScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BulletinScene' });
        this.items = [];
        this.scrollY = 0;
        this.panelHeight = 0;
        this.contentHeight = 0;
    }

    create() {
        const W = 1024, H = 768;

        // 半透明背景遮罩
        this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7);

        // 主面板
        const panelW = 700, panelH = 600;
        const panelX = W / 2, panelY = H / 2;
        this.panelHeight = panelH;

        // 面板背景
        const panelBg = this.add.rectangle(panelX, panelY, panelW, panelH, 0x1a1a2e, 0.98);
        panelBg.setStrokeStyle(3, 0xffcc00);

        // 标题栏
        const titleBar = this.add.rectangle(panelX, panelY - panelH / 2 + 40, panelW, 80, 0x16213e, 1);
        const title = this.add.text(panelX, panelY - panelH / 2 + 40, '📋 校园公告栏', {
            fontSize: '28px', fill: '#ffcc00', fontStyle: 'bold'
        }).setOrigin(0.5);

        // 关闭按钮
        const closeBtn = this.add.rectangle(panelX + panelW / 2 - 40, panelY - panelH / 2 + 20, 60, 32, 0x880000, 1)
            .setInteractive({ useHandCursor: true });
        const closeText = this.add.text(panelX + panelW / 2 - 40, panelY - panelH / 2 + 20, '✕ 关闭', {
            fontSize: '16px', fill: '#fff'
        }).setOrigin(0.5);
        closeBtn.on('pointerover', () => closeBtn.setFillStyle(0xcc0000));
        closeBtn.on('pointerout', () => closeBtn.setFillStyle(0x880000));
        closeBtn.on('pointerdown', () => {
            this.scene.start('CampusScene');
        });

        // 关闭提示
        const escHint = this.add.text(panelX + panelW / 2 - 140, panelY - panelH / 2 + 50, '按 ESC 返回', {
            fontSize: '12px', fill: '#666666'
        }).setOrigin(0.5);

        // 公告列表容器（可滚动区域）
        const listStartY = panelY - panelH / 2 + 110;
        const listAreaH = panelH - 140;
        this.contentHeight = 0;

        // 裁剪遮罩
        const maskShape = this.make.graphics();
        maskShape.fillRect(panelX - panelW / 2 + 20, listStartY, panelW - 40, listAreaH);
        const mask = maskShape.createGeometryMask();

        // 内容容器
        this.announceContainer = this.add.container(0, 0);
        this.announceContainer.setMask(mask);

        let itemY = 0;
        DEMO_ANNOUNCEMENTS.forEach((ann, idx) => {
            const cardW = panelW - 60;
            const cardH = 110;
            const cardX = panelX;
            const cardY = itemY + cardH / 2;

            // 卡片背景
            const card = this.add.rectangle(cardX, cardY, cardW, cardH, 0x222244, 0.9);
            card.setStrokeStyle(1, 0x333366);

            // 左侧颜色条
            const colorBar = this.add.rectangle(cardX - cardW / 2 + 5, cardY, 6, cardH - 10, Phaser.Display.Color.HexStringToColor(ann.color).color, 1);

            // 标题
            const titleText = this.add.text(cardX - cardW / 2 + 20, cardY - 35, ann.title, {
                fontSize: '18px', fill: '#ffffff', fontStyle: 'bold'
            });

            // 日期 + 类型标签
            const typeTag = this.add.text(cardX - cardW / 2 + 20, cardY - 10, `[${ann.type}]`, {
                fontSize: '13px', fill: ann.color
            });
            const dateText = this.add.text(cardX - cardW / 2 + 20 + typeTag.width + 10, cardY - 10, ann.date, {
                fontSize: '13px', fill: '#888888'
            });

            // 摘要（截取第一行）
            const summary = ann.content.length > 45 ? ann.content.substring(0, 45) + '...' : ann.content;
            const summaryText = this.add.text(cardX - cardW / 2 + 20, cardY + 15, summary, {
                fontSize: '14px', fill: '#bbbbbb'
            });

            // 点击查看详情
            card.setInteractive({ useHandCursor: true });
            card.on('pointerover', () => card.setFillStyle(0x333366));
            card.on('pointerout', () => card.setFillStyle(0x222244));
            card.on('pointerdown', () => {
                this.showDetail(ann);
            });

            this.announceContainer.add([card, colorBar, titleText, typeTag, dateText, summaryText]);
            itemY += cardH + 10;
        });

        this.contentHeight = itemY;

        // 滚动提示
        if (this.contentHeight > listAreaH) {
            const scrollHint = this.add.text(panelX, panelY + panelH / 2 - 15, '↑ 鼠标滚轮滚动查看更多 ↑', {
                fontSize: '13px', fill: '#666666'
            }).setOrigin(0.5);
        }

        // 鼠标滚轮滚动
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            // iOS 兼容：deltaY 可能是 -deltaY
            const delta = deltaY > 0 ? deltaY : deltaY;
            this.scrollY += delta * 0.5;
            const maxScroll = Math.max(0, this.contentHeight - listAreaH + 20);
            this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, maxScroll);
            this.announceContainer.y = listStartY - this.scrollY;
        });

        // ESC 返回
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.escKey.on('down', () => {
            this.scene.start('CampusScene');
        });
    }

    showDetail(ann) {
        const W = 1024, H = 768;

        // 清除当前场景（除了遮罩）
        this.children.removeAll(true);

        // 遮罩
        const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.8);
        overlay.setInteractive(); // 阻止点击穿透

        // 详情面板
        const panelW = 600, panelH = 420;
        const panelX = W / 2, panelY = H / 2;

        const panelBg = this.add.rectangle(panelX, panelY, panelW, panelH, 0x1a1a2e, 0.98);
        panelBg.setStrokeStyle(2, ann.color);

        // 标题栏
        const titleBar = this.add.rectangle(panelX, panelY - panelH / 2 + 30, panelW, 60, 0x16213e, 1);
        const title = this.add.text(panelX - panelW / 2 + 30, panelY - panelH / 2 + 15, ann.title, {
            fontSize: '22px', fill: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0, 0.5);

        // 关闭按钮
        const closeBtn = this.add.rectangle(panelX + panelW / 2 - 40, panelY - panelH / 2 + 15, 50, 28, 0x880000, 1)
            .setInteractive({ useHandCursor: true });
        const closeText = this.add.text(panelX + panelW / 2 - 40, panelY - panelH / 2 + 15, '✕', {
            fontSize: '16px', fill: '#fff'
        }).setOrigin(0.5);
        closeBtn.on('pointerover', () => closeBtn.setFillStyle(0xcc0000));
        closeBtn.on('pointerout', () => closeBtn.setFillStyle(0x880000));
        closeBtn.on('pointerdown', () => {
            this.scene.restart();
        });

        // 类型 + 日期
        const metaText = this.add.text(panelX - panelW / 2 + 30, panelY - panelH / 2 + 80, `[${ann.type}]  ${ann.date}`, {
            fontSize: '14px', fill: ann.color
        });

        // 分隔线
        const divider = this.add.rectangle(panelX, panelY - panelH / 2 + 105, panelW - 60, 1, 0x444466);

        // 正文
        const content = this.add.text(panelX - panelW / 2 + 30, panelY - panelH / 2 + 125, ann.content, {
            fontSize: '16px', fill: '#dddddd',
            wordWrap: { width: panelW - 60 },
            lineSpacing: 8
        });

        // 返回按钮
        const backBtn = this.add.rectangle(panelX, panelY + panelH / 2 - 40, 120, 35, 0x444444, 1)
            .setInteractive({ useHandCursor: true });
        const backText = this.add.text(panelX, panelY + panelH / 2 - 40, '← 返回列表', {
            fontSize: '16px', fill: '#ffffff'
        }).setOrigin(0.5);
        backBtn.on('pointerover', () => backBtn.setFillStyle(0x666666));
        backBtn.on('pointerout', () => backBtn.setFillStyle(0x444444));
        backBtn.on('pointerdown', () => {
            this.scene.restart();
        });

        // ESC 也能返回列表
        const escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        escKey.on('down', () => {
            this.scene.start('CampusScene');
        });
    }
}
