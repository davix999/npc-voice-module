// ============================================
// NPC Voice Module for Foundry VTT v13
// ============================================

const MODULE_ID = 'npc-voice';
const BACKEND_URL = 'https://unhuskable-jaylynn-geochronological.ngrok-free.dev';
const DEFAULT_VOICE_ID = 'ktrGUw7rURIQyMrQZqCu';

Hooks.once('ready', () => {
  console.log(`${MODULE_ID} | NPC Voice module loaded and ready`);
  startSheetWatcher();
});

// ============================================
// Watch the DOM for any actor sheet opening
// Works with ALL Foundry versions and systems
// ============================================
function startSheetWatcher() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;

        // Check if this node is an actor sheet
        const sheet = node.classList?.contains('actor') ? node
          : node.querySelector?.('.actor');

        if (sheet) {
          console.log(`${MODULE_ID} | Actor sheet detected in DOM`);
          setTimeout(() => tryInjectButton(sheet), 100);
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  console.log(`${MODULE_ID} | DOM watcher started`);
}

// ============================================
// Inject button into detected sheet
// ============================================
function tryInjectButton(sheetEl) {
  // Don't inject twice
  if (sheetEl.querySelector('.npc-voice-btn')) return;

  // Find the actor from Foundry's app registry
  const appId = sheetEl.dataset?.appid || sheetEl.id?.replace('ActorSheet-', '');
  let actor = null;

  // Search open windows for matching actor sheet
  for (const app of Object.values(ui.windows ?? {})) {
    if (app.actor && (app.element?.[0] === sheetEl || app.element === sheetEl)) {
      actor = app.actor;
      break;
    }
  }

  // V13 ApplicationV2 stores apps differently
  if (!actor) {
    for (const app of foundry.applications?.instances?.values?.() ?? []) {
      if (app.actor && app.element === sheetEl) {
        actor = app.actor;
        break;
      }
    }
  }

  if (!actor) {
    console.log(`${MODULE_ID} | Sheet found but could not resolve actor`);
    return;
  }

  // Skip player characters
  if (actor.type === 'character') return;

  console.log(`${MODULE_ID} | Injecting button for: ${actor.name}`);

  const button = document.createElement('button');
  button.className = 'npc-voice-btn';
  button.title = 'Speak as this NPC';
  button.style.cssText = 'margin: 4px; cursor: pointer; z-index: 100;';
  button.textContent = '🎙️ Speak';

  button.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const voiceId = actor.getFlag(MODULE_ID, 'voiceId') || DEFAULT_VOICE_ID;
    const dialogue = await showDialogueInput(actor.name);
    if (!dialogue) return;
    await speakDialogue(dialogue, voiceId, actor.name);
  });

  // Try to find a good header to inject into
  const targets = [
    '.window-header',
    '.sheet-header',
    '.actor-header',
    'header',
    '.window-title'
  ];

  let injected = false;
  for (const selector of targets) {
    const target = sheetEl.querySelector(selector);
    if (target) {
      target.appendChild(button);
      injected = true;
      console.log(`${MODULE_ID} | Button injected via: ${selector}`);
      break;
    }
  }

  if (!injected) {
    sheetEl.prepend(button);
    console.log(`${MODULE_ID} | Button injected via fallback prepend`);
  }
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

    if (!response.ok) throw new Error(`Backend returned ${response.status}`);

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