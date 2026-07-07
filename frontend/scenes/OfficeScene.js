import { SubSceneBase } from './SubSceneBase.js';
import { officeDialogDB } from '../utils/dialogData.js';

export class OfficeScene extends SubSceneBase {
    constructor() {
        super('OfficeScene', 'bg_office', 'npc_chen', { x: 800, y: 400 }, officeDialogDB, 'dean_chen');
    }
}