import { useState } from 'react';
import { getRuleForCard } from '../utils/cardRules';
import { getRandomRhymeWord, getRandomCategory } from '../utils/challenges';
import '../styles/Interaction.css';

export function InteractionScreen({ card, lastInteraction, drawerIdx, players, chaliceCount, onResolve, onNext }) {
  const [reflexPressed, setReflexPressed] = useState(null);
  const [rhymeWord] = useState(() => getRandomRhymeWord());
  const [category] = useState(() => getRandomCategory());

  const drawerName = players[drawerIdx].name;
  const otherName = players[drawerIdx === 0 ? 1 : 0].name;

  // Determine the interaction type — either from the current card or from lastInteraction
  const interactionType = card
    ? getRuleForCard(card.rank)?.interaction
    : lastInteraction?.type;

  // Pre-resolved info screens (mate, question_master, chalice)
  if (interactionType === 'chalice' || (!card && lastInteraction?.type === 'chalice')) {
    const { count, isLast } = lastInteraction?.data || { count: chaliceCount, isLast: false };
    return (
      <div className="interaction-screen">
        <div className="interaction-card">
          <div className="rule-icon">🏺</div>
          <h2>The Enchanted Chalice</h2>
          {isLast ? (
            <>
              <p>{drawerName} drew the LAST King!</p>
              <div className="sip-alert drawer">{drawerName} drinks the entire Chalice! +10 sips 🍺</div>
            </>
          ) : (
            <>
              <p>{drawerName} drew a King! Pour some drink into the Enchanted Chalice.</p>
              <p className="small-note">({count}/4 Kings drawn — last King drinks it all)</p>
            </>
          )}
          <button className="action-btn" onClick={onNext}>Continue →</button>
        </div>
      </div>
    );
  }

  if (interactionType === 'question_master' || (!card && lastInteraction?.type === 'question_master')) {
    return (
      <div className="interaction-screen">
        <div className="interaction-card">
          <div className="rule-icon">👑</div>
          <h2>Question Master</h2>
          <p>{drawerName} is now the Question Master!</p>
          <p className="small-note">If {otherName} answers any question directly (not with a question), they drink 3 sips. Lasts until the next Queen.</p>
          <button className="action-btn" onClick={onNext}>Understood →</button>
        </div>
      </div>
    );
  }

  if (interactionType === 'mate' || (!card && lastInteraction?.type === 'mate')) {
    return (
      <div className="interaction-screen">
        <div className="interaction-card">
          <div className="rule-icon">🔗</div>
          <h2>Enchanted Mate</h2>
          <p>{drawerName} and {otherName} are now Enchanted Mates!</p>
          <p className="small-note">Whenever {drawerName} drinks, {otherName} drinks too — for the rest of the game.</p>
          <button className="action-btn" onClick={onNext}>Sealed! →</button>
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="interaction-screen">
        <div className="interaction-card">
          <button className="action-btn" onClick={onNext}>Continue →</button>
        </div>
      </div>
    );
  }

  const rule = getRuleForCard(card.rank);

  if (!rule?.interaction) {
    return (
      <div className="interaction-screen">
        <div className="interaction-card">
          <div className="rule-icon">{rule?.icon}</div>
          <h2>{rule?.name}</h2>
          <p>{rule?.description}</p>
          <button className="action-btn" onClick={onNext}>Done →</button>
        </div>
      </div>
    );
  }

  if (rule.interaction === 'give_or_take') {
    return (
      <div className="interaction-screen">
        <div className="interaction-card">
          <div className="rule-icon">{rule.icon}</div>
          <h2>{rule.name}</h2>
          <p>{drawerName}: give or take {rule.sips} sips?</p>
          <div className="choice-row">
            <button className="choice-btn give" onClick={() => onResolve('give')}>
              Give {rule.sips} to {otherName}
            </button>
            <button className="choice-btn take" onClick={() => onResolve('take')}>
              Take {rule.sips} myself
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (rule.interaction === 'reflex') {
    return (
      <div className="interaction-screen">
        <div className="interaction-card">
          <div className="rule-icon">{rule.icon}</div>
          <h2>{rule.name}</h2>
          <p className="reflex-instruct">Both players: point to the sky RIGHT NOW!</p>
          <div className="reflex-buttons">
            <button
              className={`reflex-btn ${reflexPressed === 'drawer' ? 'pressed' : ''}`}
              onClick={() => !reflexPressed && setReflexPressed('drawer')}
            >
              ☝️ {drawerName}
            </button>
            <button
              className={`reflex-btn ${reflexPressed === 'other' ? 'pressed' : ''}`}
              onClick={() => !reflexPressed && setReflexPressed('other')}
            >
              ☝️ {otherName}
            </button>
          </div>
          {reflexPressed && (
            <>
              <div className="result-alert">
                {reflexPressed === 'drawer' ? drawerName : otherName} pointed last!<br />
                Drinks {rule.loserSips} sips! 🍺
              </div>
              <button className="action-btn" onClick={() => onResolve(reflexPressed)}>Confirm →</button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (rule.interaction === 'rhyme') {
    return (
      <div className="interaction-screen">
        <div className="interaction-card">
          <div className="rule-icon">{rule.icon}</div>
          <h2>{rule.name}</h2>
          <p>{drawerName} says: <strong>"{rhymeWord}"</strong></p>
          <p>{otherName} must rhyme it. Can't repeat, fail, or take too long — loser drinks {rule.loserSips} sips.</p>
          <p className="small-note">Drawer judges if the rhyme is valid.</p>
          <div className="choice-row">
            <button className="choice-btn give" onClick={() => onResolve('other')}>
              {otherName} failed! 🍺
            </button>
            <button className="choice-btn take" onClick={() => onResolve('drawer')}>
              {drawerName} failed! 🍺
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (rule.interaction === 'categories') {
    return (
      <div className="interaction-screen">
        <div className="interaction-card">
          <div className="rule-icon">{rule.icon}</div>
          <h2>{rule.name}</h2>
          <p>Category: <strong>{category.name}</strong></p>
          <p className="small-note">e.g. {category.examples.join(', ')}…</p>
          <p>Take turns naming things in the category. First to fail or repeat drinks {rule.loserSips} sips.</p>
          <div className="choice-row">
            <button className="choice-btn give" onClick={() => onResolve('other')}>
              {otherName} failed! 🍺
            </button>
            <button className="choice-btn take" onClick={() => onResolve('drawer')}>
              {drawerName} failed! 🍺
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (rule.interaction === 'never') {
    return (
      <div className="interaction-screen">
        <div className="interaction-card">
          <div className="rule-icon">{rule.icon}</div>
          <h2>{rule.name}</h2>
          <p>3 fingers each. Take turns saying "Never have I ever…" — if you HAVE done it, put a finger down. First to lose all 3 fingers drinks!</p>
          <div className="choice-row">
            <button className="choice-btn give" onClick={() => onResolve('other')}>
              {otherName} lost! 🍺
            </button>
            <button className="choice-btn take" onClick={() => onResolve('drawer')}>
              {drawerName} lost! 🍺
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (rule.interaction === 'waterfall') {
    return (
      <div className="interaction-screen">
        <div className="interaction-card">
          <div className="rule-icon">{rule.icon}</div>
          <h2>{rule.name}</h2>
          <p>Both drink NOW! {drawerName} goes first and stops whenever they want. {otherName} can only stop when {drawerName} does.</p>
          <div className="waterfall-note">
            <span>🍺 {drawerName}</span>
            <span className="waterfall-arrow">→</span>
            <span>🍺 {otherName}</span>
          </div>
          <button className="action-btn waterfall-done" onClick={() => onResolve('done')}>
            🌊 Waterfall Done!
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="interaction-screen">
      <div className="interaction-card">
        <button className="action-btn" onClick={onNext}>Continue →</button>
      </div>
    </div>
  );
}
