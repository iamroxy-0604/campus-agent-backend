// scenes/SubSceneBase.js
import * as Phaser from 'phaser';
import { showHint, updateHintPos, createTalkBubble, destroyTalkBubble, clearActiveHint } from '../utils/helpers.js';
import { askAgent } from '../services/agentService.js';

export class SubSceneBase extends Phaser.Scene {
    constructor(key, bgKey, npcTex, npcPos, dialogDB, agentId = null) {
        super({ key });
        this.bgKey = bgKey;
        this.npcTex = npcTex;
        this.npcPos = npcPos;
        this.dialogDB = dialogDB;
        this.agentId = agentId;
        this.moveTarget = null;
        this.SPEED = 250;
        this.currentNPC = null;
        this.isInteracting = false;
        this.dialogBox = null;
        this.dialogText = null;
        this.dialogName = null;
        this.dialogLines = null;
        this.dialogIndex = 0;
        this.npc = null;
        this.npcZone = null;
        this.currentBubbles = null;
        this.userInput = '';
        this.inputElement = null;
        this.waitingForInput = false;
    }

    // 强制换行函数
    forceWrapText(text, maxCharsPerLine = 40) {
        const lines = [];
        let currentLine = '';
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            currentLine += char;
            
            // 遇到换行符强制换行
            if (char === '\n') {
                lines.push(currentLine.slice(0, -1));
                currentLine = '';
                continue;
            }
            
            if (currentLine.length >= maxCharsPerLine) {
                lines.push(currentLine);
                currentLine = '';
            }
        }
        
        if (currentLine.length > 0) {
            lines.push(currentLine);
        }
        
        return lines.join('\n');
    }

    create() {
        const bg = this.add.image(0, 0, this.bgKey);
        bg.setOrigin(0, 0);
        const scaleX = this.cameras.main.width / bg.width;
        const scaleY = this.cameras.main.height / bg.height;
        const scale = Math.max(scaleX, scaleY);
        bg.setScale(scale);
        bg.setPosition((this.cameras.main.width - bg.width * scale) / 2,
                       (this.cameras.main.height - bg.height * scale) / 2);

        const playerSize = 150;
        const startX = this.cameras.main.width / 2;
        const startY = this.cameras.main.height - 100;
        this.player = this.add.sprite(startX, startY, 'player');
        this.player.setDisplaySize(playerSize, playerSize);
        this.player.setOrigin(0.5, 0.5);
        this.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true);
        this.player.body.setSize(100, 100);
        this.player.body.setOffset(25, 25);
        this.physics.world.setBounds(0, 0, this.cameras.main.width, this.cameras.main.height);

        const npcSize = 200;
        this.npc = this.add.sprite(this.npcPos.x, this.npcPos.y, this.npcTex);
        this.npc.setDisplaySize(npcSize, npcSize);
        this.npc.setOrigin(0.5, 0.5);
        this.physics.add.existing(this.npc, true);
        this.npc.body.immovable = true;
        this.npc.body.setSize(140, 140);
        this.npc.body.setOffset(30, 30);
        const dialogId = Object.keys(this.dialogDB)[0];
        this.npc.setData('dialogId', dialogId);
        this.npc.setData('name', this.dialogDB[dialogId].name);
        this.npcZone = { npc: this.npc, radius: 220, pos: this.npcPos };

        this.input.on('pointerdown', (pointer) => {
            if (this.isInteracting && !this.waitingForInput) {
                return;
            }
            if (!this.isInteracting) {
                const worldPos = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
                this.moveTarget = worldPos;
            }
        });

        // 对话框
        this.dialogBox = this.add.rectangle(512, 700, 800, 160, 0x000000, 0.85);
        this.dialogBox.setDepth(10);
        this.dialogBox.setVisible(false);
        
        this.dialogName = this.add.text(142, 635, '', { 
            fontSize: '20px', 
            fill: '#ffcc00', 
            fontStyle: 'bold' 
        });
        this.dialogName.setOrigin(0, 0);
        this.dialogName.setDepth(11);
        this.dialogName.setVisible(false);
        
        this.dialogText = this.add.text(142, 670, '', { 
            fontSize: '18px', 
            fill: '#fff'
        });
        this.dialogText.setOrigin(0, 0);
        this.dialogText.setDepth(11);
        this.dialogText.setVisible(false);

        this.interactionKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

        const backHint = this.add.text(this.cameras.main.width/2, 50, '按 ESC 返回校园', { fontSize: '22px', fill: '#fff', backgroundColor: '#000000aa' }).setOrigin(0.5);
        backHint.setDepth(5);
        this.input.keyboard.once('keydown-ESC', () => this.scene.start('CampusScene'));
    }

    update() {
        if (!this.isInteracting) {
            const dx = this.player.x - this.npcPos.x;
            const dy = this.player.y - this.npcPos.y;
            const dist = Math.hypot(dx, dy);
            if (dist < this.npcZone.radius && !this.currentNPC) {
                this.currentNPC = this.npc;
                showHint(this, `按 E 与 ${this.npc.getData('name')} 对话`, '#ffff00');
            } else if (dist >= this.npcZone.radius && this.currentNPC) {
                this.currentNPC = null;
                clearActiveHint();
            }
        }

        if (!this.isInteracting && this.moveTarget) {
            const dx = this.moveTarget.x - this.player.x;
            const dy = this.moveTarget.y - this.player.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 10) {
                this.player.body.setVelocity(0);
                this.moveTarget = null;
            } else {
                const angle = Math.atan2(dy, dx);
                this.player.body.setVelocity(Math.cos(angle) * this.SPEED, Math.sin(angle) * this.SPEED);
            }
        } else if (!this.isInteracting && (this.player.body.velocity.x !== 0 || this.player.body.velocity.y !== 0)) {
            this.player.body.setVelocity(0);
        }

        if (Phaser.Input.Keyboard.JustDown(this.interactionKey) && !this.isInteracting && this.currentNPC) {
            this.startDialog();
        }

        updateHintPos(this);
    }

    createInputBox(placeholder, defaultValue = '') {
    console.log('[createInputBox] 输入框被调用了', {
        placeholder,
        defaultValue
    });

        if (this.inputElement) this.removeInputBox();
        this.isInteracting = true;
        this.waitingForInput = true;

        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.left = '50%';
        div.style.top = '70%';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.backgroundColor = 'rgba(0,0,0,0.9)';
        div.style.border = '2px solid #ffcc00';
        div.style.borderRadius = '10px';
        div.style.padding = '20px';
        div.style.zIndex = '1000';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'center';

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = placeholder || '输入回答';
        input.value = defaultValue;
        input.style.fontSize = '18px';
        input.style.padding = '10px';
        input.style.width = '400px';
        input.style.marginBottom = '15px';
        input.style.borderRadius = '5px';
        input.style.border = '1px solid #ccc';
        input.style.outline = 'none';

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = '确认';
        confirmBtn.style.fontSize = '18px';
        confirmBtn.style.padding = '8px 20px';
        confirmBtn.style.backgroundColor = '#ffcc00';
        confirmBtn.style.border = 'none';
        confirmBtn.style.borderRadius = '5px';
        confirmBtn.style.cursor = 'pointer';
        confirmBtn.style.fontWeight = 'bold';

        div.appendChild(input);
        div.appendChild(confirmBtn);
        document.body.appendChild(div);

        this.inputElement = div;
        
        setTimeout(() => {
            input.focus();
            input.select();
        }, 10);

        const onConfirm = () => {
            const val = input.value.trim();
            if (val !== '') this.userInput = val;
            this.removeInputBox();
            this.dialogText.setVisible(true);
            this.dialogName.setVisible(true);
            this.waitingForInput = false;
            this.showNextLine();
        };

        confirmBtn.addEventListener('click', onConfirm);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                onConfirm();
            }
        });
    }

    removeInputBox() {
        if (this.inputElement) {
            this.inputElement.remove();
            this.inputElement = null;
        }
    }

    startDialog() {
        const id = this.npc.getData('dialogId');
        const data = this.dialogDB[id];
        if (!data) return;
        this.isInteracting = true;
        this.dialogLines = data.lines;
        this.dialogIndex = 0;
        this.userInput = '';
        this.dialogName.setText(data.name + '：');
        this.dialogName.setVisible(true);
        this.dialogBox.setVisible(true);
        this.dialogText.setVisible(true);
        this.destroyBubbles();
        this.currentBubbles = {
            player: createTalkBubble(this, this.player.x, this.player.y, true),
            npc: createTalkBubble(this, this.npc.x, this.npc.y, false)
        };
        this.showNextLine();
    }

    showNextLine() {
        if (this.dialogIndex < this.dialogLines.length) {
            const line = this.dialogLines[this.dialogIndex];
            this.dialogIndex++;

            if (typeof line === 'string') {
                let text = line.replace(/{userInput}/g, this.userInput);
                this.dialogText.setText(text);
                const clickHandler = () => {
                    this.input.off('pointerdown', clickHandler);
                    this.showNextLine();
                };
                this.input.once('pointerdown', clickHandler);
            } else if (typeof line === 'object' && line.input === true) {
                this.dialogText.setVisible(false);
                this.dialogName.setVisible(false);
                this.createInputBox(line.placeholder, line.defaultValue || '');
            } else if (typeof line === 'object' && line.agent) {
                this.dialogText.setText('🤔 正在思考...');
                const agentId = line.agent === true ? this.agentId : line.agent;
                const question = line.question ? line.question.replace(/{userInput}/g, this.userInput) : (this.userInput || '你好');
                
                askAgent(agentId, question)
                    .then(res => {
                        // 强制每行最多40个字符
                        const wrappedText = this.forceWrapText(res.answer, 40);
                        this.dialogText.setText(wrappedText);
                        const clickHandler = () => {
                            this.input.off('pointerdown', clickHandler);
                            this.showNextLine();
                        };
                        this.input.on('pointerdown', clickHandler);
                    })
                    .catch(err => {
                        console.error('[SubSceneBase] 智能体调用失败', err);
                        this.dialogText.setText('（智能体连接失败，请稍后重试）');
                        const clickHandler = () => {
                            this.input.off('pointerdown', clickHandler);
                            this.showNextLine();
                        };
                        this.input.once('pointerdown', clickHandler);
                    });
                return;
            }
        } else {
            this.dialogBox.setVisible(false);
            this.dialogText.setVisible(false);
            this.dialogName.setVisible(false);
            this.isInteracting = false;
            this.destroyBubbles();
            this.input.off('pointerdown');
        }
    }

    destroyBubbles() {
        if (this.currentBubbles) {
            if (this.currentBubbles.player) destroyTalkBubble(this.currentBubbles.player);
            if (this.currentBubbles.npc) destroyTalkBubble(this.currentBubbles.npc);
            this.currentBubbles = null;
        }
    }
}