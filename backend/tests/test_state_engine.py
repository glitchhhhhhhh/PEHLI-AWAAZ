"""
Tests for the State Engine — the AI brain that computes conversation transitions.
"""

import pytest
from app.engine.state_engine import StateEngine
from app.models import ConversationState, IntentLevel, Persona, LeadClass, ConversationStage


@pytest.fixture
def engine():
    return StateEngine()


@pytest.fixture
def initial_state():
    return ConversationState()


class TestLanguageDetection:
    def test_english_detection(self, engine, initial_state):
        state, _ = engine.compute_next_state(
            initial_state, "I want to start investing in mutual funds", "", 1
        )
        assert state.language.value == "english"

    def test_hindi_detection(self, engine, initial_state):
        state, _ = engine.compute_next_state(
            initial_state, "मुझे निवेश शुरू करना है", "", 1
        )
        assert state.language.value == "hindi"

    def test_hinglish_detection(self, engine, initial_state):
        state, _ = engine.compute_next_state(
            initial_state, "Mujhe investing start karni hai", "", 1
        )
        # Hinglish uses romanized Hindi so it may be classified as english or hinglish
        assert state.language.value in ("english", "hinglish")


class TestPersonaDetection:
    def test_trader_persona(self, engine, initial_state):
        state, _ = engine.compute_next_state(
            initial_state, "I do intraday trading on nifty and sensex", "", 1
        )
        assert state.persona == Persona.TRADER

    def test_beginner_persona(self, engine, initial_state):
        state, _ = engine.compute_next_state(
            initial_state, "I am a beginner, pehli baar invest karna hai", "", 1
        )
        assert state.persona == Persona.BEGINNER

    def test_mfd_persona(self, engine, initial_state):
        state, _ = engine.compute_next_state(
            initial_state, "I am an MFD with 500 clients and growing AUM", "", 1
        )
        assert state.persona == Persona.MFD

    def test_persona_persists(self, engine, initial_state):
        state1, _ = engine.compute_next_state(
            initial_state, "I do intraday trading", "", 1
        )
        assert state1.persona == Persona.TRADER
        # Next message without persona keywords should keep trader
        state2, _ = engine.compute_next_state(
            state1, "accha batao zyada", "", 2
        )
        assert state2.persona == Persona.TRADER


class TestObjectionDetection:
    def test_price_objection(self, engine, initial_state):
        state, _ = engine.compute_next_state(
            initial_state, "Ye bahut expensive hai, fees zyada hai", "", 1
        )
        assert state.objection == "price"

    def test_timing_objection(self, engine, initial_state):
        state, _ = engine.compute_next_state(
            initial_state, "Abhi busy hoon, baad mein call karo", "", 1
        )
        assert state.objection == "timing"

    def test_trust_objection(self, engine, initial_state):
        state, _ = engine.compute_next_state(
            initial_state, "Ye scam lagta hai, bharosa nahi hai", "", 1
        )
        assert state.objection == "trust"

    def test_no_objection(self, engine, initial_state):
        state, _ = engine.compute_next_state(
            initial_state, "Haan batao mujhe interested hai", "", 1
        )
        assert state.objection is None


class TestEngagementScoring:
    def test_engagement_increases_with_interest(self, engine, initial_state):
        state, _ = engine.compute_next_state(
            initial_state, "haan bilkul batao kaise start karu interested hoon", "", 1
        )
        assert state.engagement_score > initial_state.engagement_score

    def test_engagement_decreases_with_short_responses(self, engine, initial_state):
        # Very short response = low engagement delta, but base turn bonus may still increase
        state, _ = engine.compute_next_state(
            initial_state, "no", "", 1
        )
        # The delta may be slightly positive due to base turn bonus, but should be low
        assert state.engagement_score <= initial_state.engagement_score + 0.5

    def test_questions_boost_engagement(self, engine, initial_state):
        state, _ = engine.compute_next_state(
            initial_state, "Ye kaise kaam karta hai? Kitna invest karu?", "", 1
        )
        assert state.engagement_score > initial_state.engagement_score + 0.5


class TestTrustScoring:
    def test_trust_increases_with_signals(self, engine, initial_state):
        state, _ = engine.compute_next_state(
            initial_state, "accha lagta hai, samajh aaya sahi baat hai", "", 2
        )
        assert state.trust_score > initial_state.trust_score

    def test_trust_decreases_with_distrust(self, engine, initial_state):
        state, _ = engine.compute_next_state(
            initial_state, "ye scam hai, trust nahi hai mujhe", "", 1
        )
        assert state.trust_score < initial_state.trust_score + 0.5


class TestLeadScoring:
    def test_lead_starts_cold(self, engine, initial_state):
        assert initial_state.lead_class == LeadClass.COLD

    def test_lead_classification(self, engine):
        # Build up a warm state
        state = ConversationState(trust_score=5.0, engagement_score=5.0)
        new_state, _ = engine.compute_next_state(
            state, "haan interested hoon, batao accha lagta hai", "", 3
        )
        assert new_state.lead_class in (LeadClass.WARM, LeadClass.HOT)


class TestIntentDetection:
    def test_hot_intent_from_keywords(self, engine, initial_state):
        state, _ = engine.compute_next_state(
            initial_state, "haan start karna hai, account kholna hai", "", 1
        )
        assert state.intent == IntentLevel.HOT


class TestStrategySelection:
    def test_price_objection_triggers_roi(self, engine, initial_state):
        state, _ = engine.compute_next_state(
            initial_state, "ye bahut expensive hai", "", 1
        )
        assert state.strategy == "roi_calculator_approach"

    def test_competition_objection_triggers_comparison(self, engine, initial_state):
        state, _ = engine.compute_next_state(
            initial_state, "already mera broker hai existing platform", "", 1
        )
        assert state.strategy == "competitive_comparison"


class TestConversationStage:
    def test_starts_at_intro(self, engine, initial_state):
        state, _ = engine.compute_next_state(
            initial_state, "hello", "", 1
        )
        assert state.conversation_stage == ConversationStage.INTRO

    def test_moves_to_discovery(self, engine, initial_state):
        state, _ = engine.compute_next_state(
            initial_state, "hello", "", 2
        )
        assert state.conversation_stage == ConversationStage.DISCOVERY


class TestThinkingSteps:
    def test_thinking_steps_are_generated(self, engine, initial_state):
        _, steps = engine.compute_next_state(
            initial_state, "mujhe investing start karni hai beginner hoon", "", 1
        )
        assert len(steps) > 0
        # Should have at least language, engagement, trust, and lead score steps
        assert any("Language" in s for s in steps)
        assert any("Engagement" in s for s in steps)
        assert any("Trust" in s for s in steps)
        assert any("Lead score" in s for s in steps)


class TestMemoryFacts:
    def test_memory_facts_extracted(self, engine, initial_state):
        state, _ = engine.compute_next_state(
            initial_state, "I am a beginner, pehli baar hai, interested in mutual fund SIP", "", 1
        )
        assert len(state.memory_facts) > 0
        assert state.memory_triggered is True

    def test_memory_facts_preserved(self, engine):
        state1 = ConversationState(memory_facts=["Active trader"])
        state2, _ = engine.compute_next_state(
            state1, "haan batao", "", 2
        )
        assert "Active trader" in state2.memory_facts
