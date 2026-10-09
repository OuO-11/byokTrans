const PROMPT_STORAGE_KEY = "noveltrans_prompts_tree";

const HONORIFICS_PROMPT = `[HONORIFICS / SPEECH LEVEL] (CRITICAL)
Distinguish clearly between polite speech and casual speech.
Determine speech level based on relationship, age, rank, context, and emotional distance.

Use polite speech when:
strangers meeting first time
juniors speaking to seniors
employees to bosses
formal situations
respectful or distant relationships
Use casual speech when:
close friends
family members
lovers
same-age close peers
speaking downward in hierarchy
angry / emotional outbursts (if natural)

IMPORTANT:
Speech level changes must reflect story progression.
If characters become closer, speech may soften naturally.
If conflict occurs, speech may become colder or harsher.
NEVER make all dialogue uniformly casual.
NEVER make all dialogue uniformly polite.

KOREAN NATURALNESS

Use natural Korean dialogue such as:
Polite:
주세요
괜찮으세요?
그러셨군요
먼저 가보겠습니다
Casual:
줘
괜찮아?
그렇구나
먼저 갈게

CONSISTENCY

Each character should maintain a consistent speaking style unless the relationship changes.`;

const DEFAULT_PROMPTS_TREE = {
  chinese: {
    name: "중국어 번역기",
    basePrompt: "당신은 중국어 전문 번역가이다. [지침]\n직역투를 피하며 최대한 자연스럽게 의역하되, 원문의 말투와 내용은 철저히 유지. 원문의 사실 관계를 왜곡하거나 고유명사의 과한 현지화 금지.\n일본어 고유명사는 국립국어원 표기법을 무시하고 해당 장르 및 작품에서 대중에게 친숙한 서브컬처 통용 표기를 최우선하되, 통용 표기가 불확실하다면 실제 일본어 발음에 가깝게 표기.\n일본어가 아닌 중국어 고유명사는 원어 발음 대신 한국 한자음을 엄격히 지키며 표기.",
    presets: {
      default: {
        name: "기본소설체번역",
        content: HONORIFICS_PROMPT,
      },
    },
  },
  japanese: {
    name: "일본어 번역기",
    basePrompt: "당신은 일본어 전문 번역가이다. [지침]\n직역투를 피하며 최대한 자연스럽게 의역하되, 원문의 말투와 내용은 철저히 유지. 원문의 사실 관계를 왜곡하거나 고유명사의 과한 현지화 금지.\n일본어 고유명사는 국립국어원 표기법을 무시하고 해당 장르 및 작품에서 대중에게 친숙한 서브컬처 통용 표기를 최우선하되, 통용 표기가 불확실하다면 실제 일본어 발음에 가깝게 표기.\n일본어가 아닌 중국어 고유명사는 원어 발음 대신 한국 한자음을 엄격히 지키며 표기.",
    presets: {
      default: {
        name: "기본소설체번역",
        content: HONORIFICS_PROMPT,
      },
    },
  },
};

export function getPromptsTree() {
  const data = localStorage.getItem(PROMPT_STORAGE_KEY);
  if (!data) {
    localStorage.setItem(
      PROMPT_STORAGE_KEY,
      JSON.stringify(DEFAULT_PROMPTS_TREE),
    );
    return DEFAULT_PROMPTS_TREE;
  }
  try {
    const tree = JSON.parse(data);
    // 마이그레이션: 기존 데이터에 basePrompt가 없거나 구조가 다르면 기본값으로 채워줌
    let migrated = false;
    for (const langKey of Object.keys(DEFAULT_PROMPTS_TREE)) {
      if (!tree[langKey]) {
        tree[langKey] = DEFAULT_PROMPTS_TREE[langKey];
        migrated = true;
      } else if (!tree[langKey].basePrompt) {
        tree[langKey].basePrompt = DEFAULT_PROMPTS_TREE[langKey].basePrompt;
        migrated = true;
      }
    }
    // 쓸데없는 프리셋 강제 삭제 마이그레이션 (선택사항)
    if (tree.chinese?.presets?.conan) {
      delete tree.chinese.presets.conan;
      migrated = true;
    }
    if (tree.chinese?.presets?.naruto) {
      delete tree.chinese.presets.naruto;
      migrated = true;
    }
    if (migrated) {
      savePromptsTree(tree);
    }
    return tree;
  } catch (e) {
    console.error("Failed to parse prompt tree:", e);
    return DEFAULT_PROMPTS_TREE;
  }
}

export function savePromptsTree(tree) {
  localStorage.setItem(PROMPT_STORAGE_KEY, JSON.stringify(tree));
}

export function addLanguageCategory(langId, langName, basePromptText = "") {
  const tree = getPromptsTree();
  if (tree[langId]) return false; // 이미 존재하는 언어 코드

  tree[langId] = {
    name: langName,
    basePrompt: basePromptText,
    presets: {
      default: {
        name: "기본소설체번역",
        content: HONORIFICS_PROMPT,
      }
    },
  };
  savePromptsTree(tree);
  return tree;
}

export function updateLanguageCategory(langId, langName, basePromptText) {
  const tree = getPromptsTree();
  if (!tree[langId]) throw new Error(`존재하지 않는 언어 분류 코드입니다: ${langId}`);
  
  tree[langId].name = langName;
  tree[langId].basePrompt = basePromptText;
  savePromptsTree(tree);
  return tree;
}

export function deleteLanguageCategory(langId) {
  const tree = getPromptsTree();
  if (tree[langId]) {
    delete tree[langId];
    savePromptsTree(tree);
  }
  return tree;
}

export function savePreset(langId, presetId, presetName, content) {
  const tree = getPromptsTree();
  if (!tree[langId]) {
    throw new Error(`존재하지 않는 언어 분류 코드입니다: ${langId}`);
  }

  tree[langId].presets[presetId] = {
    name: presetName,
    content: content,
  };
  savePromptsTree(tree);
  return tree;
}

export function deletePreset(langId, presetId) {
  const tree = getPromptsTree();
  if (tree[langId] && tree[langId].presets[presetId]) {
    delete tree[langId].presets[presetId];
    savePromptsTree(tree);
  }
  return tree;
}

export function getPromptContent(langId, presetId) {
  const tree = getPromptsTree();
  const preset = tree[langId]?.presets?.[presetId];
  if (!preset) {
    return (
      tree[langId]?.presets?.default?.content ||
      DEFAULT_PROMPTS_TREE.chinese.presets.default.content
    );
  }
  return preset.content;
}

export function getBasePrompt(langId) {
  const tree = getPromptsTree();
  return tree[langId]?.basePrompt || DEFAULT_PROMPTS_TREE.chinese.basePrompt;
}
