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
// V13 compatible hooks - catches both old and new sheet rendering
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

  // Skip player characters
  if (actor.type === 'character') return;

  // Don't add button twice
  if (html.find('.npc-voice-btn').length > 0) return;

  const button = $(`
    <button type="button" class="npc-voice-btn" 
      title="Speak as this NPC" 
      style="margin: 4px; cursor: pointer;">
      🎙️ Speak
    </button>
  `);

  // Try multiple selectors to cover different sheet styles
  const targets = [
    '.window-header',
    '.sheet-header',
    '.actor-header',
    'header.sheet-header',
    '.npc-sheet header'
  ];

  let injected = false;
  for (const selector of targets) {
    const target = html.find(selector);
    if (target.length > 0) {
      target.append(button);
      injected = true;
      console.log(`${MODULE_ID} | Button injected via selector: ${selector}`);
      break;
    }
  }

  // Fallback - prepend to the whole sheet
  if (!injected) {
    html.prepend(button);
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
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: 'Cancel',
          callback: () => resolve(null)
        }
      },
      default: 'speak'
    }).render(true);
  });
}

// ============================================
// Call backend and play returned audio
// ============================================
async function speakDialogue(text, voiceId, npcName) {
  if (!text) return;

  try {
    ui.notifications.info(`${npcName} is speaking...`);

    const response = await fetch(`${BACKEND_URL}/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice_id: voiceId })
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();

    ui.notifications.info(`${npcName}: "${text}"`);

  } catch (error) {
    console.error(`${MODULE_ID} | Error:`, error);
    ui.notifications.error(`NPC Voice failed: ${error.message}`);
  }
}