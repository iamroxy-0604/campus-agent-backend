// utils/SidebarUI.js
// 星露谷风格侧边栏 —— 用 Container 统一管理，关闭即销毁，杜绝残留
import * as Phaser from 'phaser';

const SLOT_COLOR = 0x5c3a1e;
const SLOT_BORDER = 0x8b6914;
const SLOT_SELECTED = 0xd4a017;
const PANEL_BG = 0x3d2817;
const PANEL_BORDER = 0xc49a2a;

const TABS = [
    { id: 'bulletin', icon: '📋', label: '公告栏', color: '#ffcc00' },
    { id: 'market', icon: '🛒', label: '二手市场', color: '#81c784' },
    { id: 'friends', icon: '👥', label: '好友', color: '#ffb74d' },
];

const BULLETIN_DATA = [
    { title: '校园网络维护通知', date: '07-08', type: '系统通知', color: '#4fc3f7', detail: '校园WiFi将于7月10日凌晨2:00-6:00进行升级维护，届时网络暂停服务，请提前安排。' },
    { title: '二手交易平台即将上线', date: '07-07', type: '平台公告', color: '#81c784', detail: '校园智能体即将推出二手交易功能！同学们可以发布闲置物品、浏览商品、在线沟通。' },
    { title: '暑期体育馆开放调整', date: '07-06', type: '场馆通知', color: '#ffb74d', detail: '暑假期间体育馆开放时间调整为14:00-20:00，游泳池暂停使用。' },
    { title: '校园卡充值优惠活动', date: '07-05', type: '优惠活动', color: '#ef5350', detail: '即日起校园卡在麦当劳消费满30元立减5元，体育馆预约8折！' },
    { title: '歌手大赛开始报名', date: '07-04', type: '活动通知', color: '#ce93d8', detail: '校园歌手大赛初赛7月20日，决赛7月28日。一等奖蓝牙耳机！' },
    { title: '图书馆暑期借阅变更', date: '07-03', type: '系统通知', color: '#4fc3f7', detail: '暑假借阅期限由30天延长至60天，已借图书自动延期。' },
];

const MARKET_DATA = [
    { id: 1, title: '高等数学（第七版）', price: '¥15', seller: '大二学长', cond: '九成新', tag: '教材' },
    { id: 2, title: 'MacBook Pro 14寸', price: '¥8,500', seller: '毕业生小王', cond: '95新', tag: '数码' },
    { id: 3, title: '机械键盘 IKBC C87', price: '¥120', seller: '电竞社', cond: '八成新', tag: '外设' },
    { id: 4, title: '床上书桌 折叠款', price: '¥35', seller: '6号楼学姐', cond: '七成新', tag: '生活' },
    { id: 5, title: '二手山地自行车', price: '¥280', seller: '研二老李', cond: '六成新', tag: '出行' },
    { id: 6, title: '考研英语真题2025', price: '¥25', seller: '考研上岸学姐', cond: '少量笔记', tag: '考研' },
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
        this.slots = [];             // 侧边栏槽位元素
        this.panelContainer = null;  // 面板容器（关闭时整个销毁）
        this.wheelFn = null;         // 滚轮回调
    }

    // ============ 创建侧边栏 ============
    create() {
        const SIZE = 56, GAP = 8, START_Y = 180;
        TABS.forEach((tab, i) => {
            const x = 34, y = START_Y + i * (SIZE + GAP);

            const bg = this.scene.add.rectangle(x, y, SIZE, SIZE, SLOT_COLOR)
                .setStrokeStyle(2, SLOT_BORDER)
                .setScrollFactor(0).setDepth(60);

            const icon = this.scene.add.text(x, y - 6, tab.icon, { fontSize: '22px' })
                .setOrigin(0.5).setScrollFactor(0).setDepth(61);

            const label = this.scene.add.text(x, y + 20, tab.label,
                { fontSize: '10px', fill: '#d4c5a0' })
                .setOrigin(0.5).setScrollFactor(0).setDepth(61);

            const hit = this.scene.add.rectangle(x, y, SIZE, SIZE, 0x000000, 0)
                .setScrollFactor(0).setDepth(62).setInteractive({ useHandCursor: true });

            hit.on('pointerover', () => {
                if (this.activeTab !== tab.id) { bg.setFillStyle(0x7a4e22); label.setColor('#fff'); }
            });
            hit.on('pointerout', () => {
                if (this.activeTab !== tab.id) { bg.setFillStyle(SLOT_COLOR); label.setColor('#d4c5a0'); }
            });
            hit.on('pointerdown', (p) => { p.event.stopPropagation(); this.toggle(tab); });

            this.slots.push({ id: tab.id, bg, icon, label, hit, tab, x, y });
        });

        // 遮罩（点击关闭）
        this.overlay = this.scene.add.rectangle(512, 384, 1024, 768, 0x000000, 0)
            .setScrollFactor(0).setDepth(64).setInteractive().setVisible(false);
        this.overlay.on('pointerdown', (p) => { p.event.stopPropagation(); this.close(); });

        // 全局关闭按钮
        this.closeBtn = this.scene.add.text(980, 35, '✕',
            { fontSize: '32px', fill: '#f66', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 })
            .setOrigin(0.5).setScrollFactor(0).setDepth(100).setInteractive({ useHandCursor: true }).setVisible(false);
        this.closeBtn.on('pointerdown', (p) => { p.event.stopPropagation(); this.close(); });
    }

    // ============ 切换面板 ============
    toggle(tab) {
        if (this.activeTab === tab.id) { this.close(); return; }
        this.open(tab);
    }

    open(tab) {
        this.close();  // 先清干净
        this.activeTab = tab.id;

        // 高亮槽位
        this.slots.forEach(s => {
            if (s.id === tab.id) {
                s.bg.setFillStyle(0x8b6914).setStrokeStyle(3, SLOT_SELECTED);
                s.label.setColor('#fff');
            } else {
                s.bg.setFillStyle(SLOT_COLOR).setStrokeStyle(2, SLOT_BORDER);
                s.label.setColor('#d4c5a0');
            }
        });

        this.scene.isInteracting = true;
        this.overlay.setVisible(true).setFillStyle(0x000000, 0.35);
        this.closeBtn.setVisible(true).setDepth(100);

        // 面板容器 —— 所有面板内容放里面，关闭时整个销毁
        this.panelContainer = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(65);

        const W = 1024, H = 768;
        const pw = 460, ph = 500;
        const cx = W / 2 + 20, cy = H / 2;

        // 面板背景
        const panelBg = this.scene.add.rectangle(cx, cy, pw, ph, PANEL_BG, 0.97)
            .setStrokeStyle(3, PANEL_BORDER);
        this.panelContainer.add(panelBg);

        // 标题
        const titleY = cy - ph / 2 + 30;
        const titleBg = this.scene.add.rectangle(cx, titleY, pw - 6, 46, 0x2a1a0a);
        const titleTxt = this.scene.add.text(cx - pw / 2 + 20, titleY, `${tab.icon}  ${tab.label}`,
            { fontSize: '22px', fill: '#ffcc00', fontStyle: 'bold' }).setOrigin(0, 0.5);
        this.panelContainer.add([titleBg, titleTxt]);

        // 分隔线
        const divY = titleY + 28;
        this.panelContainer.add(this.scene.add.rectangle(cx, divY, pw - 20, 2, PANEL_BORDER));

        // 内容区（可滚动容器）
        const listTop = divY + 18;
        const listH = ph - 90;
        const innerW = pw - 36;

        // 裁剪遮罩
        const maskGfx = this.scene.make.graphics();
        maskGfx.fillRect(cx - pw / 2 + 10, listTop, pw - 20, listH);
        const mask = maskGfx.createGeometryMask();

        const listCtn = this.scene.add.container(0, 0).setMask(mask);
        this.panelContainer.add(listCtn);

        // 保存引用以便滚动
        this._listCtn = listCtn;
        this._listTop = listTop;
        this._listH = listH;
        this._maskGfx = maskGfx;
        this._cx = cx;
        this._pw = pw;  // 保存 pw 供详情页使用
        this._tab = tab; // 保存 tab 供详情页返回

        // 渲染内容
        let totalH = 0;
        if (tab.id === 'bulletin') totalH = this._buildBulletin(listCtn, cx, innerW);
        else if (tab.id === 'market') totalH = this._buildMarket(listCtn, cx, innerW);
        else if (tab.id === 'friends') this._buildFriends(listCtn, cx, innerW, listTop, listH);

        // 滚轮
        if (totalH > listH) {
            let sy = 0;
            this.wheelFn = (pointer, go, dx, dy) => {
                if (this.activeTab !== tab.id) return;
                sy += dy * 0.3;
                sy = Phaser.Math.Clamp(sy, 0, totalH - listH + 10);
                listCtn.y = listTop - sy;
            };
            this.scene.input.on('wheel', this.wheelFn);
        }
    }

    close() {
        // 销毁面板容器（包含所有子元素）
        if (this.panelContainer) {
            this.panelContainer.destroy();
            this.panelContainer = null;
        }
        // 清理滚轮监听
        if (this.wheelFn) {
            this.scene.input.off('wheel', this.wheelFn);
            this.wheelFn = null;
        }
        this._listCtn = null;
        this._maskGfx = null;
        this._tab = null;

        this.scene.isInteracting = false;
        this.activeTab = null;
        this.overlay.setVisible(false);
        this.closeBtn.setVisible(false);

        this.slots.forEach(s => {
            s.bg.setFillStyle(SLOT_COLOR).setStrokeStyle(2, SLOT_BORDER);
            s.label.setColor('#d4c5a0');
        });
    }

    // ============ 公告栏列表 ============
    _buildBulletin(ctn, cx, iw) {
        let y = 0;
        BULLETIN_DATA.forEach(item => {
            const ch = 66, cy2 = y + ch / 2;

            const card = this.scene.add.rectangle(cx, cy2, iw, ch, 0x5c3a1e, 0.85).setStrokeStyle(1, 0x7a5a30);
            card.setInteractive({ useHandCursor: true });
            card.on('pointerover', () => card.setFillStyle(0x7a4e22));
            card.on('pointerout', () => card.setFillStyle(0x5c3a1e));
            card.on('pointerdown', (p) => { p.event.stopPropagation(); this._showDetail(item); });
            ctn.add(card);

            const bar = this.scene.add.rectangle(cx - iw / 2 + 4, cy2, 4, ch - 8,
                Phaser.Display.Color.HexStringToColor(item.color).color);
            ctn.add(bar);

            // 标题（截断防溢出）
            const t = item.title.length > 16 ? item.title.slice(0, 16) + '…' : item.title;
            ctn.add(this.scene.add.text(cx - iw / 2 + 14, cy2 - 14, t,
                { fontSize: '15px', fill: '#f0e6d3', fontStyle: 'bold' }));

            ctn.add(this.scene.add.text(cx - iw / 2 + 14, cy2 + 10, `${item.date} · ${item.type}`,
                { fontSize: '11px', fill: '#a09080' }));

            ctn.add(this.scene.add.text(cx + iw / 2 - 25, cy2, '▶',
                { fontSize: '14px', fill: '#888' }).setOrigin(0.5));

            y += ch + 6;
        });
        return y;
    }

    _showDetail(item) {
        // 销毁当前面板，重建详情
        if (this.panelContainer) { this.panelContainer.destroy(); this.panelContainer = null; }
        if (this.wheelFn) { this.scene.input.off('wheel', this.wheelFn); this.wheelFn = null; }

        this.panelContainer = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(65);
        const W = 1024, H = 768;
        const pw = 440, ph = 360;
        const cx = W / 2 + 20, cy = H / 2;

        this.panelContainer.add(
            this.scene.add.rectangle(cx, cy, pw, ph, PANEL_BG, 0.98)
                .setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(item.color).color)
        );

        const tY = cy - ph / 2 + 25;
        this.panelContainer.add(this.scene.add.rectangle(cx, tY, pw - 6, 42, 0x2a1a0a));
        this.panelContainer.add(this.scene.add.text(cx - pw / 2 + 18, tY, item.title,
            { fontSize: '17px', fill: '#ffcc00', fontStyle: 'bold' }).setOrigin(0, 0.5));

        // 关闭按钮 → 返回列表
        const cb = this.scene.add.text(cx + pw / 2 - 18, tY, '✕',
            { fontSize: '18px', fill: '#f66' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        cb.on('pointerdown', (p) => { p.event.stopPropagation(); this.open(this._tab); });
        this.panelContainer.add(cb);

        const dY = tY + 26;
        this.panelContainer.add(this.scene.add.rectangle(cx, dY, pw - 20, 1, PANEL_BORDER));

        this.panelContainer.add(this.scene.add.text(cx - pw / 2 + 18, dY + 16,
            `${item.date}  [${item.type}]`, { fontSize: '12px', fill: item.color }));

        // 正文（带自动换行，不溢出）
        this.panelContainer.add(this.scene.add.text(cx - pw / 2 + 18, dY + 42, item.detail,
            { fontSize: '14px', fill: '#d4c5a0', wordWrap: { width: pw - 46 }, lineSpacing: 5 }));

        // 返回按钮
        const bb = this.scene.add.rectangle(cx, cy + ph / 2 - 30, 120, 30, 0x5c3a1e)
            .setStrokeStyle(1, PANEL_BORDER).setInteractive({ useHandCursor: true });
        const bt = this.scene.add.text(cx, cy + ph / 2 - 30, '← 返回列表',
            { fontSize: '14px', fill: '#f0e6d3' }).setOrigin(0.5);
        bb.on('pointerover', () => bb.setFillStyle(0x7a4e22));
        bb.on('pointerout', () => bb.setFillStyle(0x5c3a1e));
        bb.on('pointerdown', (p) => { p.event.stopPropagation(); this.open(this._tab); });
        this.panelContainer.add([bb, bt]);
    }

    // ============ 二手市场列表 ============
    _buildMarket(ctn, cx, iw) {
        let y = 0;
        MARKET_DATA.forEach(item => {
            const ch = 58, cy2 = y + ch / 2;
            const card = this.scene.add.rectangle(cx, cy2, iw, ch, 0x5c3a1e, 0.85).setStrokeStyle(1, 0x7a5a30);
            ctn.add(card);

            ctn.add(this.scene.add.text(cx - iw / 2 + 10, cy2 - 15, `[${item.tag}]`,
                { fontSize: '11px', fill: '#81c784' }));
            const t = item.title.length > 12 ? item.title.slice(0, 12) + '…' : item.title;
            ctn.add(this.scene.add.text(cx - iw / 2 + 55, cy2 - 15, t,
                { fontSize: '14px', fill: '#f0e6d3', fontStyle: 'bold' }));

            ctn.add(this.scene.add.text(cx - iw / 2 + 10, cy2 + 10, item.price,
                { fontSize: '16px', fill: '#ef5350', fontStyle: 'bold' }));
            ctn.add(this.scene.add.text(cx - iw / 2 + 65, cy2 + 12,
                `${item.seller} · ${item.cond}`, { fontSize: '11px', fill: '#a09080' }));
            ctn.add(this.scene.add.text(cx + iw / 2 - 35, cy2, '💬',
                { fontSize: '18px' }).setOrigin(0.5).setInteractive({ useHandCursor: true }));

            y += ch + 6;
        });
        return y;
    }

    // ============ 好友列表 ============
    _buildFriends(ctn, cx, iw, top, maxH) {
        FRIENDS_DATA.forEach((f, i) => {
            const ch = 48, cy2 = top + 28 + i * 56;

            const card = this.scene.add.rectangle(cx, cy2, iw, ch, 0x5c3a1e, 0.85).setStrokeStyle(1, 0x7a5a30);
            ctn.add(card);

            ctn.add(this.scene.add.text(cx - iw / 2 + 22, cy2, f.avatar,
                { fontSize: '22px' }).setOrigin(0.5));
            ctn.add(this.scene.add.text(cx - iw / 2 + 52, cy2 - 9, f.name,
                { fontSize: '15px', fill: '#f0e6d3', fontStyle: 'bold' }));
            ctn.add(this.scene.add.text(cx - iw / 2 + 52, cy2 + 9,
                `● ${f.status}  |  在${f.scene}`, { fontSize: '11px', fill: f.color }));
            ctn.add(this.scene.add.text(cx + iw / 2 - 30, cy2, '💬 私聊',
                { fontSize: '12px', fill: '#d4a017' }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
        });

        ctn.add(this.scene.add.text(cx, top + maxH - 20, '好友聊天功能将在后续版本上线',
            { fontSize: '12px', fill: '#7a6a50' }).setOrigin(0.5));
    }

    // ============ 销毁 ============
    destroy() {
        this.close();
        this.slots.forEach(s => {
            s.bg.destroy(); s.icon.destroy(); s.label.destroy(); s.hit.destroy();
        });
        this.slots = [];
        if (this.overlay) this.overlay.destroy();
        if (this.closeBtn) this.closeBtn.destroy();
    }
}
