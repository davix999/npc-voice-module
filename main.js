// ============================================
// NPC Voice Module for Foundry VTT v13
// ============================================

const MODULE_ID = 'npc-voice';
const BACKEND_URL = 'https://unhuskable-jaylynn-geochronological.ngrok-free.dev';
const DEFAULT_VOICE_ID = 'ktrGUw7rURIQyMrQZqCu';

// ============================================
// Module Ready
// ============================================
Hooks.once('ready', () => {
  console.log(`${MODULE_ID} | NPC Voice module loaded and ready`);
});

// ============================================
// V13 compatible hooks
// ============================================
Hooks.on('renderActorSheet', (sheet, html, data) => {
  injectSpeakButton(sheet, html);
});

Hooks.on('renderActorSheetV2', (sheet, html, data) => {
  injectSpeakButton(sheet, $(html));
});

// ============================================
// Inject Speak button into NPC sheets
// ============================================
function injectSpeakButton(sheet, html) {
  const actor = sheet.actor;
  if (actor.type === 'character') return;

  const $html = html instanceof HTMLElement ? $(html) : html;

  if ($html.find('.npc-voice-btn').length > 0) return;

  const button = $(`
    <button type="button" class="npc-voice-btn" 
      title="Speak as this NPC" 
      style="margin: 4px; cursor: pointer; z-index:100;">
      🎙️ Speak
    </button>
  `);

  const targets = [
    '.window-header',
    '.sheet-header',
    '.actor-header',
    'header',
    '.window-content'
  ];

  let injected = false;
  for (const selector of targets) {
    const target = $html.find(selector);
    if (target.length > 0) {
      target.first().append(button);
      injected = true;
      console.log(`${MODULE_ID} | Button injected via: ${selector}`);
      break;
    }
  }

  if (!injected) {
    $html.prepend(button);
    console.log(`${MODULE_ID} | Button injected via fallback`);
  }

  button.on('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const voiceId = actor.getFlag(MODULE_ID, 'voiceId') || DEFAULT_VOICE_ID;
    const dialogue = await showDialogueInput(actor.name);
    if (!dialogue) return;
    await speakDialogue(dialogue, voiceId, actor.name);
  });
}

// ============================================
// Show dialogue input dialog
// ============================================
async function showDialogueInput(npcName) {
  return new Promise((resolve) => {
    new Dialog({
      title: `${npcName} speaks...`,
      content: `
        <div style="padding: 8px 0;">
          <label>What does <strong>${npcName}</strong> say?</label>
          <textarea 
            id="npc-dialogue" 
            style="width:100%; height:100px; margin-top:8px; resize:vertical;"
            placeholder="Enter dialogue...">
          </textarea>
        </div>
      `,
      buttons: {
        speak: {
          icon: '<i class="fas fa-microphone"></i>',
          label: 'Speak',
          callback: (html) => resolve(html.find('#npc-dialogue').val().trim())
        },