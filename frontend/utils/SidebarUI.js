// utils/SidebarUI.js
// 游戏侧边栏 —— 公告栏 + 二手市场 + 好友
import * as Phaser from 'phaser';

const TABS = [
    { id: 'bulletin', label: '📋', name: '公告栏', color: 0x4fc3f7 },
    { id: 'market', label: '🛒', name: '二手市场', color: 0x81c784 },
    { id: 'friends', label: '👥', name: '好友', color: 0xffb74d },
];

// ---- 演示数据 ----

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
    { id: 2, title: 'MacBook Pro 2023 14寸', price: '¥8500', seller: '毕业生小王', condition: '95新', tag: '数码' },
    { id: 3, title: '机械键盘 IKBC C87', price: '¥120', seller: '电竞社成员', condition: '八成新', tag: '外设' },
    { id: 4, title: '床上书桌 折叠款', price: '¥35', seller: '6号楼学姐', condition: '七成新', tag: '生活' },
    { id: 5, title: '二手自行车 山地车', price: '¥280', seller: '研二老李', condition: '六成新', tag: '出行' },
    { id: 6, title: '考研英语真题 2025版', price: '¥25', seller: '考研上岸学姐', condition: '少量笔记', tag: '考研' },
];

const FRIENDS_DATA = [
    { name: '小明', status: '在线', avatar: '😊', scene: '图书馆' },
    { name: '小红', status: '在线', avatar: '😄', scene: '体育馆' },
    { name: '小李', status: '忙碌', avatar: '🤔', scene: '机房' },
    { name: '小张', status: '离线', avatar: '😴', scene: '-' },
    { name: '学姐', status: '在线', avatar: '💁', scene: '麦当劳' },
];

export class SidebarUI {
    constructor(scene) {
        this.scene = scene;
        this.activeTab = null;
        this.panelContainer = null;
        this.tabBtns = [];
        this.tabHints = [];
        this.visible = true;
    }

    create() {
        const W = this.scene.cameras.main.width;

        // 侧边栏背景
        this.sidebarBg = this.scene.add.rectangle(25, 384, 50, 768, 0x111122, 0.85);
        this.sidebarBg.setScrollFactor(0);
        this.sidebarBg.setDepth(50);
        this.sidebarBg.setStrokeStyle(1, 0x333366);

        // Tab 按钮
        TABS.forEach((tab, i) => {
            const y = 200 + i * 70;

            // 按钮背景
            const btn = this.scene.add.rectangle(25, y, 44, 60, 0x222244, 1);
            btn.setScrollFactor(0);
            btn.setDepth(51);
            btn.setInteractive({ useHandCursor: true });
            btn.setStrokeStyle(1, 0x444488);

            // 图标
            const icon = this.scene.add.text(25, y - 8, tab.label, {
                fontSize: '22px'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(52);

            // 名称（竖排小字）
            const name = this.scene.add.text(25, y + 18, tab.name, {
                fontSize: '10px', fill: '#aaa'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(52);

            btn.on('pointerover', () => {
                btn.setFillStyle(0x333366);
                name.setColor('#fff');
            });
            btn.on('pointerout', () => {
                if (this.activeTab !== tab.id) {
                    btn.setFillStyle(0x222244);
                    name.setColor('#aaa');
                }
            });
            btn.on('pointerdown', () => {
                this.togglePanel(tab);
            });

            this.tabBtns.push({ id: tab.id, btn, icon, name, tab });
        });

        // 关闭面板按钮（初始隐藏）
        this.closeBtn = this.scene.add.text(W - 30, 30, '✕', {
            fontSize: '28px', fill: '#ff4444', fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setInteractive({ useHandCursor: true });
        this.closeBtn.setVisible(false);
        this.closeBtn.on('pointerdown', () => this.closePanel());
    }

    togglePanel(tab) {
        if (this.activeTab === tab.id) {
            this.closePanel();
            return;
        }
        this.openPanel(tab);
    }

    openPanel(tab) {
        // 先关闭已有面板
        this.closePanel(true);

        this.activeTab = tab.id;

        // 高亮选中的tab
        this.tabBtns.forEach(t => {
            if (t.id === tab.id) {
                t.btn.setFillStyle(Phaser.Display.Color.HexStringToColor(tab.color).color);
            } else {
                t.btn.setFillStyle(0x222244);
            }
        });

        const W = this.scene.cameras.main.width;
        const H = this.scene.cameras.main.height;
        const panelW = 500, panelH = 560;
        const panelX = 300, panelY = H / 2;

        // 面板（不跟随滚动）
        this.panelContainer = this.scene.add.container(0, 0);
        this.panelContainer.setScrollFactor(0);
        this.panelContainer.setDepth(55);

        const bg = this.scene.add.rectangle(panelX, panelY, panelW, panelH, 0x1a1a2e, 0.97);
        bg.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(tab.color).color);

        const title = this.scene.add.text(panelX, panelY - panelH / 2 + 35, `${tab.label} ${tab.name}`, {
            fontSize: '22px', fill: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5);

        const divider = this.scene.add.rectangle(panelX, panelY - panelH / 2 + 65, panelW - 40, 1, 0x333366);

        this.panelContainer.add([bg, title, divider]);

        // 根据 tab 渲染不同内容
        if (tab.id === 'bulletin') this.buildBulletinPanel(panelX, panelY, panelW, panelH);
        else if (tab.id === 'market') this.buildMarketPanel(panelX, panelY, panelW, panelH);
        else if (tab.id === 'friends') this.buildFriendsPanel(panelX, panelY, panelW, panelH);

        // 关闭按钮
        this.closeBtn.setVisible(true);
        this.closeBtn.setDepth(100);
    }

    closePanel(silent = false) {
        if (this.panelContainer) {
            this.panelContainer.destroy();
            this.panelContainer = null;
        }
        this.activeTab = null;
        this.closeBtn.setVisible(false);

        // 重置tab颜色
        this.tabBtns.forEach(t => {
            t.btn.setFillStyle(0x222244);
            t.name.setColor('#aaa');
        });
    }

    // ---- 公告栏面板 ----
    buildBulletinPanel(cx, cy, pw, ph) {
        const listTop = cy - ph / 2 + 85;
        const listH = ph - 110;

        // 裁剪遮罩
        const maskGfx = this.scene.make.graphics();
        maskGfx.fillRect(cx - pw / 2 + 15, listTop, pw - 30, listH);
        const mask = maskGfx.createGeometryMask();

        const listContainer = this.scene.add.container(0, 0);
        listContainer.setMask(mask);

        let itemY = 0;
        const cardW = pw - 50;

        BULLETIN_DATA.forEach((ann, i) => {
            const cardH = 78;
            const y = itemY + cardH / 2;

            const card = this.scene.add.rectangle(cx, y, cardW, cardH, 0x222244, 0.9);
            card.setStrokeStyle(1, 0x333366);
            card.setInteractive({ useHandCursor: true });
            card.on('pointerover', () => card.setFillStyle(0x2a2a55));
            card.on('pointerout', () => card.setFillStyle(0x222244));
            card.on('pointerdown', () => {
                this.showDetail(ann, cx, cy, pw, ph);
            });

            // 左侧颜色条
            const bar = this.scene.add.rectangle(cx - cardW / 2 + 4, y, 4, cardH - 10,
                Phaser.Display.Color.HexStringToColor(ann.color).color, 1);

            const title = this.scene.add.text(cx - cardW / 2 + 16, y - 20, ann.title, {
                fontSize: '16px', fill: '#fff', fontStyle: 'bold'
            });
            const meta = this.scene.add.text(cx - cardW / 2 + 16, y + 5, `${ann.date} · ${ann.type}`, {
                fontSize: '12px', fill: '#888'
            });
            const clickHint = this.scene.add.text(cx + cardW / 2 - 60, y + 5, '点击查看 >', {
                fontSize: '11px', fill: '#666'
            });

            listContainer.add([card, bar, title, meta, clickHint]);
            itemY += cardH + 8;
        });

        this.panelContainer.add(listContainer);

        // 滚动（如果内容超出）
        const totalH = itemY;
        if (totalH > listH) {
            let scrollY = 0;
            this.scene.input.on('wheel', (pointer, gameObjects, dx, dy) => {
                if (this.activeTab !== 'bulletin') return;
                scrollY += dy * 0.3;
                scrollY = Phaser.Math.Clamp(scrollY, 0, totalH - listH + 20);
                listContainer.y = listTop - scrollY;
            });
        }
    }

    showDetail(ann, cx, cy, pw, ph) {
        // 隐藏列表
        this.panelContainer.destroy();
        this.panelContainer = this.scene.add.container(0, 0);
        this.panelContainer.setScrollFactor(0);
        this.panelContainer.setDepth(55);

        const tab = TABS.find(t => t.id === this.activeTab);

        const bg = this.scene.add.rectangle(cx, cy, pw, ph, 0x1a1a2e, 0.97);
        bg.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(ann.color).color);

        const title = this.scene.add.text(cx - pw / 2 + 25, cy - ph / 2 + 30, ann.title, {
            fontSize: '20px', fill: '#fff', fontStyle: 'bold'
        }).setOrigin(0, 0.5);

        const closeBtn = this.scene.add.text(cx + pw / 2 - 30, cy - ph / 2 + 20, '✕', {
            fontSize: '20px', fill: '#ff4444'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerdown', () => {
            this.panelContainer.destroy();
            this.openPanel(tab);  // 返回列表
        });

        const divider = this.scene.add.rectangle(cx, cy - ph / 2 + 58, pw - 40, 1, 0x333366);

        const meta = this.scene.add.text(cx - pw / 2 + 25, cy - ph / 2 + 80, `${ann.date}  [${ann.type}]`, {
            fontSize: '13px', fill: ann.color
        });

        const content = this.scene.add.text(cx - pw / 2 + 25, cy - ph / 2 + 115, ann.content, {
            fontSize: '15px', fill: '#ddd', wordWrap: { width: pw - 60 }, lineSpacing: 6
        });

        const backBtn = this.scene.add.rectangle(cx, cy + ph / 2 - 40, 130, 35, 0x333366, 1)
            .setInteractive({ useHandCursor: true });
        const backText = this.scene.add.text(cx, cy + ph / 2 - 40, '←  返回列表', {
            fontSize: '15px', fill: '#fff'
        }).setOrigin(0.5);
        backBtn.on('pointerover', () => backBtn.setFillStyle(0x444488));
        backBtn.on('pointerout', () => backBtn.setFillStyle(0x333366));
        backBtn.on('pointerdown', () => {
            this.panelContainer.destroy();
            this.openPanel(tab);
        });

        this.panelContainer.add([bg, title, closeBtn, divider, meta, content, backBtn, backText]);
    }

    // ---- 二手市场面板 ----
    buildMarketPanel(cx, cy, pw, ph) {
        const listTop = cy - ph / 2 + 85;
        const listH = ph - 110;
        const cardW = pw - 50;

        // 搜索提示
        const searchHint = this.scene.add.text(cx, cy + ph / 2 - 35, '🔍 搜索和发布功能将在后续版本上线', {
            fontSize: '13px', fill: '#666'
        }).setOrigin(0.5);
        this.panelContainer.add(searchHint);

        const maskGfx = this.scene.make.graphics();
        maskGfx.fillRect(cx - pw / 2 + 15, listTop, pw - 30, listH - 30);
        const mask = maskGfx.createGeometryMask();

        const listContainer = this.scene.add.container(0, 0);
        listContainer.setMask(mask);

        let itemY = 0;
        MARKET_DATA.forEach(item => {
            const cardH = 72;
            const y = itemY + cardH / 2;

            const card = this.scene.add.rectangle(cx, y, cardW, cardH, 0x222244, 0.9);
            card.setStrokeStyle(1, 0x333366);
            card.setInteractive({ useHandCursor: true });
            card.on('pointerover', () => card.setFillStyle(0x2a2a55));
            card.on('pointerout', () => card.setFillStyle(0x222244));

            const tag = this.scene.add.text(cx - cardW / 2 + 14, y - 18, `[${item.tag}]`, {
                fontSize: '11px', fill: '#81c784'
            });
            const title = this.scene.add.text(cx - cardW / 2 + 14 + 50, y - 18, item.title.substring(0, 18), {
                fontSize: '15px', fill: '#fff', fontStyle: 'bold'
            });

            const price = this.scene.add.text(cx - cardW / 2 + 14, y + 10, item.price, {
                fontSize: '18px', fill: '#ef5350', fontStyle: 'bold'
            });
            const seller = this.scene.add.text(cx - cardW / 2 + 80, y + 12, `${item.seller} · ${item.condition}`, {
                fontSize: '12px', fill: '#888'
            });
            const contact = this.scene.add.text(cx + cardW / 2 - 70, y + 10, '💬 联系', {
                fontSize: '13px', fill: '#ffcc00'
            }).setInteractive({ useHandCursor: true });

            listContainer.add([card, tag, title, price, seller, contact]);
            itemY += cardH + 8;
        });

        this.panelContainer.add(listContainer);

        const totalH = itemY;
        if (totalH > listH) {
            let scrollY = 0;
            this.scene.input.on('wheel', (pointer, gameObjects, dx, dy) => {
                if (this.activeTab !== 'market') return;
                scrollY += dy * 0.3;
                scrollY = Phaser.Math.Clamp(scrollY, 0, totalH - listH + 20);
                listContainer.y = listTop - scrollY;
            });
        }
    }

    // ---- 好友面板 ----
    buildFriendsPanel(cx, cy, pw, ph) {
        const listTop = cy - ph / 2 + 85;

        FRIENDS_DATA.forEach((friend, i) => {
            const y = listTop + 25 + i * 65;
            const rowW = pw - 50;

            // 行背景
            const row = this.scene.add.rectangle(cx, y, rowW, 55, 0x222244, 0.7);
            row.setStrokeStyle(1, 0x333366);

            const avatar = this.scene.add.text(cx - rowW / 2 + 18, y, friend.avatar, {
                fontSize: '24px'
            }).setOrigin(0.5);

            const name = this.scene.add.text(cx - rowW / 2 + 55, y - 10, friend.name, {
                fontSize: '16px', fill: '#fff', fontStyle: 'bold'
            });

            const statusColor = friend.status === '在线' ? '#81c784' : friend.status === '忙碌' ? '#ffb74d' : '#666';
            const status = this.scene.add.text(cx - rowW / 2 + 55, y + 10, `● ${friend.status}  |  在${friend.scene}`, {
                fontSize: '12px', fill: statusColor
            });

            // 私聊按钮
            const chatBtn = this.scene.add.text(cx + rowW / 2 - 50, y, '💬', {
                fontSize: '20px'
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            this.panelContainer.add([row, avatar, name, status, chatBtn]);
        });

        // 底部提示
        const hint = this.scene.add.text(cx, cy + ph / 2 - 25, '好友聊天功能将在后续版本上线', {
            fontSize: '13px', fill: '#666'
        }).setOrigin(0.5);
        this.panelContainer.add(hint);
    }

    destroy() {
        this.closePanel();
        if (this.sidebarBg) this.sidebarBg.destroy();
        this.tabBtns.forEach(t => {
            if (t.btn) t.btn.destroy();
            if (t.icon) t.icon.destroy();
            if (t.name) t.name.destroy();
        });
        if (this.closeBtn) this.closeBtn.destroy();
        this.tabBtns = [];
    }
}
