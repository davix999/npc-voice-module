// ============================================
// NPC Voice Module for Foundry VTT v13
// ============================================

const MODULE_ID = 'npc-voice';

// Your backend URL - we'll make this configurable later
// For now point it at wherever the backend is running
const BACKEND_URL = 'https://unhuskable-jaylynn-geochronological.ngrok-free.dev';

// Default voice ID - will be per-NPC configurable later
const DEFAULT_VOICE_ID = 'ktrGUw7rURIQyMrQZqCu';

// ============================================
// Module Ready
// ============================================
Hooks.once('ready', () => {
  console.log(`${MODULE_ID} | NPC Voice module loaded and ready`);
});

// ============================================
// Inject Speak button into any NPC actor sheet
// Works across multiple game systems
// ============================================
Hooks.on('renderActorSheet', (sheet, html, data) => {
  const actor = sheet.actor;

  // Skip player characters - only target NPCs
  if (actor.type === 'character') return;

  // Build the button
  const button = $(`
    <button type="button" class="npc-voice-btn" title="Speak as this NPC" style="margin: 4px;">
      🎙️ Speak
    </button>
  `);

  // Inject into the sheet header
 const header = html.find('.window-header');
if (header.length) {
  header.append(button);
} else {
  html.prepend(button);
}

  // Handle click
  button.on('click', async (event) => {
    event.preventDefault();

    // Get stored voice ID for this NPC, fall back to default
    const voiceId = actor.getFlag(MODULE_ID, 'voiceId') || DEFAULT_VOICE_ID;

    // Show dialogue input dialog
    const dialogue = await showDialogueInput(actor.name);
    if (!dialogue) return;

    // Send to backend and play audio
    await speakDialogue(dialogue, voiceId, actor.name);
  });
});

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

    // Convert response to playable audio
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