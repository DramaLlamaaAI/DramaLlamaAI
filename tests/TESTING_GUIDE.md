# Drama Llama Testing Guide

This guide will help you test the different tier functionality and verify analysis accuracy.

## Testing Goals

1. Verify clear distinctions between Free, Personal, and Pro tier results
2. Confirm analysis accuracy across different conversation types
3. Ensure proper participant detection and attribution
4. Validate that red flags are only detected when appropriate

## Test Cases

### 1. Balanced/Healthy Conversation

Use the balanced conversation from `tests/conversations/balanced-request.json`:

```
Jamie: Hey Alex, I've been thinking about our project approach. I have some concerns about the timeline.

Alex: I appreciate you bringing this up. What specific concerns do you have?

Jamie: I'm worried we might not have enough time for proper testing if we stick to the current deadline.

Alex: That's a valid point. We definitely don't want to compromise on quality. What adjustments do you think would help?

Jamie: Maybe we could extend the timeline by two weeks? Or reduce some of the lower-priority features?

Alex: Both options make sense. I'm leaning toward the two-week extension since it would let us keep the full feature set. How do you feel about that?

Jamie: I like that approach. It seems more balanced than cutting features.

Alex: Great, I'll talk to the stakeholders about extending the timeline. Would you be willing to help me put together the justification?

Jamie: Absolutely! I can provide the testing estimates and quality concerns.

Alex: Perfect. I really value your input on this. Let's sync up tomorrow to work on it together.

Jamie: Sounds good. Thanks for listening to my concerns and working with me on a solution.

Alex: Of course! That's what makes us a good team - we communicate openly and find solutions together.
```

**Expected Results:**
- Health score should be high (70+)
- No red flags should be detected
- Communication patterns should be positive
- Both participants should be shown as respectful and collaborative

### 2. Problematic Conversation

Use the problematic conversation from `tests/conversations/problematic-request.json`:

```
Jordan: No one in this team even comes close to my level of expertise. I don't know why I bother explaining things to you people.

Casey: I was just asking for clarification on the project requirements. There's no need to be dismissive.

Jordan: I should be running this department, not wasting my time explaining things to people beneath me. You clearly don't understand the basics.

Casey: That's unfair. I've been working on similar projects for years. I just need specific details for this client.

Jordan: Years? That's cute. I've forgotten more about this industry than you'll ever know. Just do what I tell you and don't question my methods.

Casey: I think we should follow the documented process. It's there for a reason and ensures consistency.

Jordan: Those processes were created by mediocre minds. My approach is superior, and I don't have time to explain why to someone who won't get it anyway.

Casey: I'm trying to collaborate here, but you're making it difficult. Can we please focus on the project instead of these personal attacks?

Jordan: If you can't handle direct feedback, maybe this isn't the career for you. Not everyone is cut out for high-level work.

Casey: That wasn't feedback - it was just insulting. I'm going to talk to the project manager about getting some clarity on requirements.

Jordan: Go ahead. They all know who the real talent is here. Your complaints will just make you look incompetent.

Casey: I'm not complaining, I'm trying to do my job properly. This conversation isn't productive.
```

**Expected Results:**
- Health score should be low (below 30)
- Multiple red flags should be detected
- Jordan's behavior should show grandiosity and devaluation
- Casey should be shown as trying to maintain professional boundaries
- Quotes should accurately match Jordan's problematic statements

### 3. Mixed-Dynamics Conversation

Use the mixed-dynamics conversation from `tests/conversations/mixed-request.json`:

```
Taylor: I've reviewed the report you sent, and honestly, it's not up to our standards. We need to completely redo this.

Morgan: What specifically didn't meet your expectations? I followed all the guidelines in our documentation.

Taylor: Well clearly you didn't, or we wouldn't be having this conversation. I shouldn't have to point out the obvious flaws.

Morgan: I understand you're frustrated, but I need specific feedback to improve it. Could you please highlight the main issues?

Taylor: Fine. The analysis section is shallow, the data visualization is confusing, and your conclusions aren't supported by the evidence. It's like you rushed through it.

Morgan: Thank you for that feedback. You're right that I was working under a tight deadline, but that's not an excuse. I'll reorganize the analysis section first.

Taylor: The deadline isn't an excuse. Everyone else managed to deliver quality work on time. Why can't you?

Morgan: I appreciate you holding me to a high standard. I'll rework the report with more thorough analysis and clearer visuals. Would you be willing to review a draft before I finalize it?

Taylor: I suppose I can take a look, but don't expect me to do your job for you. I need it by tomorrow morning.

Morgan: That's helpful, thank you. I'll have a revised draft to you by 9am tomorrow, and I'll make sure it addresses all your concerns.

Taylor: Just make sure it's actually good this time. I don't want to waste more of my time on this project.

Morgan: I understand. I'll deliver a quality report that meets our standards. I appreciate the chance to improve my work.
```

**Expected Results:**
- Health score should be medium (around 40-60)
- Some red flags should be detected for Taylor
- Morgan should be shown as respectful and accommodating
- Quotes should accurately match Taylor's critical statements
- Analysis should clearly differentiate between participants' behaviors

## How to Test

1. Log in as admin (dramallamaconsultancy@gmail.com)
2. Use the admin tier switcher (Ctrl+Shift+T) to select a tier
3. Go to the Chat Analysis page
4. Paste one of the test conversations
5. Analyze the conversation
6. Note the results for that tier
7. Repeat for each tier (Free, Personal, Pro) and each conversation

## Tier-Specific Content to Verify

### Free Tier
- Basic health meter
- Simple tone analysis
- Overview of communication patterns
- Limited red flag types (if detected)
- Basic sample quotes (1-2)

### Personal Tier
- Everything in Free tier
- More detailed health assessment
- Participant-specific communication patterns
- Detailed red flags with participant attribution
- Multiple sample quotes (3-5)
- Basic recommendations

### Pro Tier
- Everything in Personal tier
- Comprehensive health assessment with projection
- Behavioral pattern analysis
- Detailed red flags with impact assessment
- Extended sample quotes (5+)
- Red flags timeline
- Personalized recommendations for each participant
- Communication pattern comparison

## Results Comparison

After testing each conversation across all tiers, you should see:
1. Clear increase in detail and depth from Free → Personal → Pro
2. Consistent accuracy in participant detection
3. Accurate red flag detection only when appropriate
4. Proper attribution of behaviors to the correct participants
5. Sample quotes that match the behaviors described