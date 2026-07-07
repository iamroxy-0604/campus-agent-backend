// utils/SidebarUI.js
// 星露谷风格侧边栏 —— 公告栏 + 二手市场 + 好友
import * as Phaser from 'phaser';

const SLOT_COLOR = 0x5c3a1e;      // 木框深棕
const SLOT_BORDER = 0x8b6914;     // 金边
const SLOT_SELECTED = 0xd4a017;   // 选中高亮金
const PANEL_BG = 0x3d2817;        // 面板深木色
const PANEL_BORDER = 0xc49a2a;    // 面板金框

const TABS = [
    { id: 'bulletin', icon: '📋', label: '公告栏', color: '#ffcc00' },
    { id: 'market', icon: '🛒', label: '二手市场', color: '#81c784' },
    { id: 'friends', icon: '👥', label: '好友', color: '#ffb74d' },
];

const BULLETIN_DATA = [
    { title: '校园网络维护通知', date: '07-08', type: '系统通知', color: '#4fc3f7', content: '校园WiFi将于7月10日凌晨2:00-6:00进行升级维护，届时网络暂停服务，请提前安排。' },
    { title: '二手交易平台即将上线', date: '07-07', type: '平台公告', color: '#81c784', content: '校园智能体即将推出二手交易功能！同学们可以发布闲置物品、浏览商品、在线沟通。' },
    { title: '暑期体育馆开放调整', date: '07-06', type: '场馆通知', color: '#ffb74d', content: '暑假期间体育馆开放时间调整为14:00-20:00，游泳池暂停使用。' },
    { title: '校园卡充值优惠活动', date: '07-05', type: '优惠活动', color: '#ef5350', content: '即日起校园卡在麦当劳消费满30元立减5元，体育馆预约8折！' },
    { title: '歌手大赛开始报名', date: '07-04', type: '活动通知', color: '#ce93d8', content: '校园歌手大赛初赛7月20日，决赛7月28日。一等奖蓝牙耳机！' },
    { title: '图书馆暑期借阅变更', date: '07-03', type: '系统通知', color: '#4fc3f7', content: '暑假借阅期限由30天延长至60天，已借图书自动延期。' },
];

const MARKET_DATA = [
    { id: 1, title: '高等数学（第七版）上册', price: '¥15', seller: '大二学长', condition: '九成新', tag: '教材' },
    { id: 2, title: 'MacBook Pro 2023 14寸', price: '¥8,500', seller: '毕业生小王', condition: '95新', tag: '数码' },
    { id: 3, title: '机械键盘 IKBC C87', price: '¥120', seller: '电竞社成员', condition: '八成新', tag: '外设' },
    { id: 4, title: '床上书桌 折叠款', price: '¥35', seller: '6号楼学姐', condition: '七成新', tag: '生活' },
    { id: 5, title: '二手自行车 山地车', price: '¥280', seller: '研二老李', condition: '六成新', tag: '出行' },
    { id: 6, title: '考研英语真题 2025版', price: '¥25', seller: '考研上岸学姐', condition: '少量笔记', tag: '考研' },
];

const FRIENDS_DATA = [
    { name: '小明', status: '在线', avatar: '😊', scene: '图书馆', color: '#81c784' },
    { name: '小红', status: '在线', avatar: '😄', scene: '体育馆', color: '#81c784' },
    { name: '小李', status: '忙碌', avatar: '🤔', scene: '机房', color: '#ffb74d' },
    { name: '小张', status: '离线', avatar: '😴', scene: '-', color: '#888888' },
    { name: '学姐', status: '在线', avatar: '💁', scene: '麦当劳', color: '#81c784' },
];

export class SidebarUI {
    constructor(scene) {
        this.scene = scene;
        this.activeTab = null;
        this.panelElements = [];
        this.slotElements = [];
    }

    create() {
        const SLOT_SIZE = 56;
        const GAP = 8;
        const START_Y = 180;

        TABS.forEach((tab, i) => {
            const x = 34;
            const y = START_Y + i * (SLOT_SIZE + GAP);

            // 槽位背景（星露谷风格木框）
            const slotBg = this.scene.add.rectangle(x, y, SLOT_SIZE, SLOT_SIZE, SLOT_COLOR, 1);
            slotBg.setStrokeStyle(2, SLOT_BORDER);
            slotBg.setScrollFactor(0);
            slotBg.setDepth(60);

            // 图标
            const icon = this.scene.add.text(x, y - 6, tab.icon, {
                fontSize: '22px'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(61);

            // 标签
            const label = this.scene.add.text(x, y + 20, tab.label, {
                fontSize: '10px', fill: '#d4c5a0'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(61);

            // 交互区域（扩大点击范围）
            const hitArea = this.scene.add.rectangle(x, y, SLOT_SIZE, SLOT_SIZE, 0x000000, 0);
            hitArea.setScrollFactor(0);
            hitArea.setDepth(62);
            hitArea.setInteractive({ useHandCursor: true });

            hitArea.on('pointerover', () => {
                if (this.activeTab !== tab.id) {
                    slotBg.setFillStyle(0x7a4e22);
                    label.setColor('#ffffff');
                }
            });
            hitArea.on('pointerout', () => {
                if (this.activeTab !== tab.id) {
                    slotBg.setFillStyle(SLOT_COLOR);
                    label.setColor('#d4c5a0');
                }
            });
            hitArea.on('pointerdown', (pointer) => {
                pointer.event.stopPropagation();
                this.togglePanel(tab);
            });

            this.slotElements.push({
                id: tab.id, slotBg, icon, label, hitArea, tab,
                x, y, size: SLOT_SIZE
            });
        });

        // 关闭按钮（初始隐藏）
        this.closeIcon = this.scene.add.text(980, 35, '✕', {
            fontSize: '32px', fill: '#ff6666', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setInteractive({ useHandCursor: true });
        this.closeIcon.setVisible(false);
        this.closeIcon.on('pointerdown', (pointer) => {
            pointer.event.stopPropagation();
            this.closePanel();
        });

        // 半透明遮罩层（面板打开时）
        this.overlay = this.scene.add.rectangle(512, 384, 1024, 768, 0x000000, 0);
        this.overlay.setScrollFactor(0);
        this.overlay.setDepth(64);
        this.overlay.setInteractive();
        this.overlay.setVisible(false);
        this.overlay.on('pointerdown', (pointer) => {
            pointer.event.stopPropagation();
            this.closePanel();
        });
    }

    togglePanel(tab) {
        if (this.activeTab === tab.id) {
            this.closePanel();
        } else {
            this.openPanel(tab);
        }
    }

    openPanel(tab) {
        this.closePanel(true);
        this.activeTab = tab.id;

        // 高亮选中槽
        this.slotElements.forEach(s => {
            if (s.id === tab.id) {
                s.slotBg.setFillStyle(0x8b6914);
                s.slotBg.setStrokeStyle(3, SLOT_SELECTED);
                s.label.setColor('#ffffff');
            } else {
                s.slotBg.setFillStyle(SLOT_COLOR);
                s.slotBg.setStrokeStyle(2, SLOT_BORDER);
                s.label.setColor('#d4c5a0');
            }
        });

        // 阻止玩家移动
        this.scene.isInteracting = true;

        // 显示遮罩
        this.overlay.setVisible(true);
        this.overlay.setFillStyle(0x000000, 0.35);

        const W = 1024, H = 768;
        const panelW = 480, panelH = 530;
        const panelX = W / 2 + 20, panelY = H / 2;

        // 面板背景（星露谷风格）
        const panelBg = this.scene.add.rectangle(panelX, panelY, panelW, panelH, PANEL_BG, 0.97);
        panelBg.setStrokeStyle(3, PANEL_BORDER);
        panelBg.setScrollFactor(0);
        panelBg.setDepth(65);

        // 标题栏
        const titleBg = this.scene.add.rectangle(panelX, panelY - panelH / 2 + 28, panelW - 6, 50, 0x2a1a0a, 1);
        titleBg.setScrollFactor(0);
        titleBg.setDepth(66);

        const titleText = this.scene.add.text(panelX - panelW / 2 + 25, panelY - panelH / 2 + 18,
            `${tab.icon}  ${tab.label}`, {
                fontSize: '22px', fill: '#ffcc00', fontStyle: 'bold'
            }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(67);

        // 分隔线
        const divider = this.scene.add.rectangle(panelX, panelY - panelH / 2 + 58, panelW - 20, 2, PANEL_BORDER);
        divider.setScrollFactor(0);
        divider.setDepth(67);

        this.panelElements = [panelBg, titleBg, titleText, divider];

        // 内容区
        const contentTop = panelY - panelH / 2 + 80;
        const contentH = panelH - 105;

        if (tab.id === 'bulletin') {
            this.buildList(contentTop, contentH, panelX, panelW, BULLETIN_DATA, 'bulletin', tab);
        } else if (tab.id === 'market') {
            this.buildMarketList(contentTop, contentH, panelX, panelW, tab);
        } else if (tab.id === 'friends') {
            this.buildFriendsList(contentTop, contentH, panelX, panelW, tab);
        }

        this.closeIcon.setVisible(true);
        this.closeIcon.setDepth(100);
    }

    closePanel(silent = false) {
        this.panelElements.forEach(el => el.destroy());
        this.panelElements = [];
        // 恢复玩家移动
        this.scene.isInteracting = false;
        this.activeTab = null;
        this.overlay.setVisible(false);
        this.closeIcon.setVisible(false);

        this.slotElements.forEach(s => {
            s.slotBg.setFillStyle(SLOT_COLOR);
            s.slotBg.setStrokeStyle(2, SLOT_BORDER);
            s.label.setColor('#d4c5a0');
        });
    }

    // ---- 通用列表渲染 ----
    buildList(top, maxH, cx, pw, items, type, tab) {
        const cardW = pw - 36;

        // 裁剪遮罩
        const maskGfx = this.scene.make.graphics();
        maskGfx.fillRect(cx - pw / 2 + 10, top, pw - 20, maxH);
        const mask = maskGfx.createGeometryMask();

        const listContainer = this.scene.add.container(0, 0);
        listContainer.setMask(mask);
        listContainer.setScrollFactor(0);
        listContainer.setDepth(67);

        let itemY = 0;
        items.forEach((item, i) => {
            const cardH = type === 'bulletin' ? 72 : 68;
            const y = itemY + cardH / 2;

            const card = this.scene.add.rectangle(cx, y, cardW, cardH, 0x5c3a1e, 0.85);
            card.setStrokeStyle(1, 0x7a5a30);
            card.setScrollFactor(0);
            card.setDepth(67);
            card.setInteractive({ useHandCursor: true });
            card.on('pointerover', () => card.setFillStyle(0x7a4e22));
            card.on('pointerout', () => card.setFillStyle(0x5c3a1e));
            card.on('pointerdown', (pointer) => {
                pointer.event.stopPropagation();
                if (type === 'bulletin') {
                    this.showBulletinDetail(item, cx, pw, tab);
                }
            });

            listContainer.add(card);

            if (type === 'bulletin') {
                const colorBar = this.scene.add.rectangle(cx - cardW / 2 + 4, y, 4, cardH - 8,
                    Phaser.Display.Color.HexStringToColor(item.color).color, 1);
                colorBar.setScrollFactor(0).setDepth(68);
                listContainer.add(colorBar);

                const title = this.scene.add.text(cx - cardW / 2 + 16, y - 14, item.title, {
                    fontSize: '15px', fill: '#f0e6d3', fontStyle: 'bold'
                }).setScrollFactor(0).setDepth(68);
                const meta = this.scene.add.text(cx - cardW / 2 + 16, y + 10, `${item.date} · [${item.type}]`, {
                    fontSize: '11px', fill: '#a09080'
                }).setScrollFactor(0).setDepth(68);
                const arrow = this.scene.add.text(cx + cardW / 2 - 40, y + 10, '>', {
                    fontSize: '12px', fill: '#888'
                }).setScrollFactor(0).setDepth(68);
                listContainer.add(title, meta, arrow);
            }

            itemY += cardH + 6;
        });

        this.panelElements.push(listContainer);

        if (itemY > maxH) {
            let scrollY = 0;
            const wheelHandler = (pointer, gameObjects, dx, dy) => {
                if (this.activeTab !== type) return;
                scrollY += dy * 0.3;
                scrollY = Phaser.Math.Clamp(scrollY, 0, itemY - maxH + 10);
                listContainer.y = top - scrollY;
            };
            this.scene.input.on('wheel', wheelHandler);
            this._wheelHandler = wheelHandler;
        }
    }

    buildMarketList(top, maxH, cx, pw, tab) {
        const cardW = pw - 36;
        const maskGfx = this.scene.make.graphics();
        maskGfx.fillRect(cx - pw / 2 + 10, top, pw - 20, maxH - 10);
        const mask = maskGfx.createGeometryMask();

        const listContainer = this.scene.add.container(0, 0);
        listContainer.setMask(mask);
        listContainer.setScrollFactor(0);
        listContainer.setDepth(67);

        let itemY = 0;
        MARKET_DATA.forEach(item => {
            const cardH = 62;
            const y = itemY + cardH / 2;

            const card = this.scene.add.rectangle(cx, y, cardW, cardH, 0x5c3a1e, 0.85);
            card.setStrokeStyle(1, 0x7a5a30);
            card.setScrollFactor(0).setDepth(67);

            const tag = this.scene.add.text(cx - cardW / 2 + 12, y - 16, `[${item.tag}]`, {
                fontSize: '11px', fill: '#81c784'
            }).setScrollFactor(0).setDepth(68);
            const title = this.scene.add.text(cx - cardW / 2 + 60, y - 16, item.title.substring(0, 16), {
                fontSize: '14px', fill: '#f0e6d3', fontStyle: 'bold'
            }).setScrollFactor(0).setDepth(68);

            const price = this.scene.add.text(cx - cardW / 2 + 12, y + 10, item.price, {
                fontSize: '16px', fill: '#ef5350', fontStyle: 'bold'
            }).setScrollFactor(0).setDepth(68);
            const seller = this.scene.add.text(cx - cardW / 2 + 70, y + 12, `${item.seller} · ${item.condition}`, {
                fontSize: '11px', fill: '#a09080'
            }).setScrollFactor(0).setDepth(68);
            const contact = this.scene.add.text(cx + cardW / 2 - 50, y + 8, '💬', {
                fontSize: '18px'
            }).setScrollFactor(0).setDepth(68).setInteractive({ useHandCursor: true });

            listContainer.add(card, tag, title, price, seller, contact);
            itemY += cardH + 6;
        });

        this.panelElements.push(listContainer);

        if (itemY > maxH) {
            let scrollY = 0;
            const wheelHandler = (pointer, gameObjects, dx, dy) => {
                if (this.activeTab !== 'market') return;
                scrollY += dy * 0.3;
                scrollY = Phaser.Math.Clamp(scrollY, 0, itemY - maxH + 10);
                listContainer.y = top - scrollY;
            };
            this.scene.input.on('wheel', wheelHandler);
            this._wheelHandler = wheelHandler;
        }
    }

    buildFriendsList(top, maxH, cx, pw, tab) {
        FRIENDS_DATA.forEach((friend, i) => {
            const cardW = pw - 36;
            const cardH = 50;
            const y = top + 30 + i * 58;
            const x = cx;

            const card = this.scene.add.rectangle(x, y, cardW, cardH, 0x5c3a1e, 0.85);
            card.setStrokeStyle(1, 0x7a5a30);
            card.setScrollFactor(0).setDepth(67);

            const avatar = this.scene.add.text(x - cardW / 2 + 20, y, friend.avatar, {
                fontSize: '22px'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(68);

            const name = this.scene.add.text(x - cardW / 2 + 50, y - 9, friend.name, {
                fontSize: '15px', fill: '#f0e6d3', fontStyle: 'bold'
            }).setScrollFactor(0).setDepth(68);

            const info = this.scene.add.text(x - cardW / 2 + 50, y + 9,
                `● ${friend.status}  |  在 ${friend.scene}`, {
                    fontSize: '11px', fill: friend.color
                }).setScrollFactor(0).setDepth(68);

            const chat = this.scene.add.text(x + cardW / 2 - 40, y, '💬 私聊', {
                fontSize: '13px', fill: '#d4a017'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(68).setInteractive({ useHandCursor: true });

            this.panelElements.push(card, avatar, name, info, chat);
        });

        const hint = this.scene.add.text(cx, top + maxH - 15, '好友聊天功能将在后续版本上线', {
            fontSize: '12px', fill: '#7a6a50'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(68);
        this.panelElements.push(hint);
    }

    showBulletinDetail(ann, cx, pw, tab) {
        this.panelElements.forEach(el => el.destroy());
        this.panelElements = [];

        const W = 1024, H = 768;
        const panelW = 460, panelH = 380;
        const panelX = W / 2 + 20, panelY = H / 2;

        const panelBg = this.scene.add.rectangle(panelX, panelY, panelW, panelH, PANEL_BG, 0.98);
        panelBg.setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(ann.color).color);
        panelBg.setScrollFactor(0).setDepth(65);

        const titleBg = this.scene.add.rectangle(panelX, panelY - panelH / 2 + 25, panelW - 6, 45, 0x2a1a0a, 1);
        titleBg.setScrollFactor(0).setDepth(66);

        const title = this.scene.add.text(panelX - panelW / 2 + 20, panelY - panelH / 2 + 15, ann.title, {
            fontSize: '18px', fill: '#ffcc00', fontStyle: 'bold'
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(67);

        const closeBtn = this.scene.add.text(panelX + panelW / 2 - 20, panelY - panelH / 2 + 12, '✕', {
            fontSize: '20px', fill: '#ff6666'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(67).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerdown', (pointer) => {
            pointer.event.stopPropagation();
            this.panelElements.forEach(el => el.destroy());
            this.panelElements = [];
            this.openPanel(tab);
        });

        const divider = this.scene.add.rectangle(panelX, panelY - panelH / 2 + 52, panelW - 20, 1, PANEL_BORDER);
        divider.setScrollFactor(0).setDepth(67);

        const meta = this.scene.add.text(panelX - panelW / 2 + 20, panelY - panelH / 2 + 70,
            `${ann.date}  [${ann.type}]`, { fontSize: '13px', fill: ann.color }
        ).setScrollFactor(0).setDepth(67);

        const content = this.scene.add.text(panelX - panelW / 2 + 20, panelY - panelH / 2 + 100, ann.content, {
            fontSize: '14px', fill: '#d4c5a0', wordWrap: { width: panelW - 50 }, lineSpacing: 6
        }).setScrollFactor(0).setDepth(67);

        const backBtnBg = this.scene.add.rectangle(panelX, panelY + panelH / 2 - 35, 120, 32, 0x5c3a1e, 1);
        backBtnBg.setStrokeStyle(1, PANEL_BORDER);
        backBtnBg.setScrollFactor(0).setDepth(67).setInteractive({ useHandCursor: true });
        const backBtn = this.scene.add.text(panelX, panelY + panelH / 2 - 35, '← 返回列表', {
            fontSize: '14px', fill: '#f0e6d3'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(68);

        backBtnBg.on('pointerover', () => backBtnBg.setFillStyle(0x7a4e22));
        backBtnBg.on('pointerout', () => backBtnBg.setFillStyle(0x5c3a1e));
        backBtnBg.on('pointerdown', (pointer) => {
            pointer.event.stopPropagation();
            this.panelElements.forEach(el => el.destroy());
            this.panelElements = [];
            this.openPanel(tab);
        });

        this.panelElements.push(panelBg, titleBg, title, closeBtn, divider, meta, content, backBtnBg, backBtn);
    }

    destroy() {
        this.closePanel();
        this.slotElements.forEach(s => {
            if (s.slotBg) s.slotBg.destroy();
            if (s.icon) s.icon.destroy();
            if (s.label) s.label.destroy();
            if (s.hitArea) s.hitArea.destroy();
        });
        if (this.overlay) this.overlay.destroy();
        if (this.closeIcon) this.closeIcon.destroy();
        if (this._wheelHandler) {
            this.scene.input.off('wheel', this._wheelHandler);
        }
        this.slotElements = [];
        this.panelElements = [];
    }
}
