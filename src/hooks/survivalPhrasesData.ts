import type { SurvivalPhrase } from '@/types/travel';

/** Static survival phrases — no API call needed. */
export const SURVIVAL_PHRASES: SurvivalPhrase[] = [
  // ─── Greetings ───────────────────────────────────────────────────
  {
    id: 'greetings-0',
    situation: 'greetings',
    english: 'Hello',
    japanese: 'こんにちは',
    romaji: 'konnichiwa',
    breakdown: 'こんにちは (konnichiwa) — standard daytime greeting',
    whenToUse: 'Anytime from late morning to early evening when greeting someone',
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'greetings-1',
    situation: 'greetings',
    english: 'Good morning',
    japanese: 'おはようございます',
    romaji: 'ohayou gozaimasu',
    breakdown: 'おはよう (ohayou) = early/morning + ございます (gozaimasu) = polite suffix',
    whenToUse: 'Until about 10-11am. Use the shorter おはよう (ohayou) with friends.',
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'greetings-2',
    situation: 'greetings',
    english: 'Good evening',
    japanese: 'こんばんは',
    romaji: 'konbanwa',
    breakdown: 'こんばん (konban) = this evening + は (wa) = topic particle',
    whenToUse: 'From late afternoon/evening onward when greeting someone',
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'greetings-3',
    situation: 'greetings',
    english: 'Thank you very much',
    japanese: 'ありがとうございます',
    romaji: 'arigatou gozaimasu',
    breakdown: 'ありがとう (arigatou) = thanks + ございます (gozaimasu) = polite suffix',
    whenToUse: 'Whenever someone helps you, serves you, or does anything kind',
    culturalNote:
      'This is the single most useful phrase in Japan. A slight head nod while saying it is appreciated.',
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'greetings-4',
    situation: 'greetings',
    english: "Excuse me / I'm sorry",
    japanese: 'すみません',
    romaji: 'sumimasen',
    breakdown: 'すみません (sumimasen) — multi-purpose: apology, getting attention, light thanks',
    whenToUse:
      'To get a waiter\'s attention, apologize for bumping someone, or as a humble "thank you"',
    culturalNote:
      "This is arguably more useful than arigatou. Japanese people use it constantly — it's never too much.",
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'greetings-5',
    situation: 'greetings',
    english: 'Goodbye',
    japanese: 'さようなら',
    romaji: 'sayounara',
    breakdown: 'さようなら (sayounara) — formal goodbye',
    whenToUse: 'When parting ways. For casual goodbyes, じゃあね (jaa ne) is more natural.',
    culturalNote:
      'Sayounara implies you won\'t see someone for a while. For "see you later," use また (mata).',
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'greetings-6',
    situation: 'greetings',
    english: 'Nice to meet you',
    japanese: 'はじめまして、よろしくお{願|ねが}いします',
    romaji: 'hajimemashite, yoroshiku onegai shimasu',
    breakdown:
      'はじめまして (hajimemashite) = first time meeting + よろしくお願いします (yoroshiku onegai shimasu) = please treat me well',
    whenToUse: 'When meeting someone for the first time — at hotels, tours, or making new friends',
    formality: 'polite',
    difficulty: 2,
  },
  {
    id: 'greetings-7',
    situation: 'greetings',
    english: 'Sorry to bother you (before asking something)',
    japanese: 'お{忙|いそが}しいところすみません',
    romaji: 'oisogashii tokoro sumimasen',
    breakdown:
      'お忙しい (oisogashii) = busy + ところ (tokoro) = while/moment + すみません (sumimasen) = excuse me',
    whenToUse:
      'Before asking a stranger for help — shows extra politeness and is very well received',
    culturalNote:
      "This preamble makes Japanese people much more willing to help. It acknowledges you're interrupting them.",
    formality: 'very_polite',
    difficulty: 3,
  },

  // ─── Restaurant ──────────────────────────────────────────────────
  {
    id: 'restaurant-0',
    situation: 'restaurant',
    english: 'Two people, please',
    japanese: '{二人|ふたり}です',
    romaji: 'futari desu',
    breakdown: '二人 (futari) = two people + です (desu) = is/are',
    whenToUse: 'When the host asks how many people at the entrance. Use 一人 (hitori) for one.',
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'restaurant-1',
    situation: 'restaurant',
    english: 'This one, please',
    japanese: 'これをお{願|ねが}いします',
    romaji: 'kore wo onegai shimasu',
    breakdown:
      'これ (kore) = this + を (wo) = object marker + お願いします (onegai shimasu) = please',
    whenToUse:
      'Point at the menu item and say this. Works everywhere — restaurants, shops, ticket counters.',
    culturalNote:
      'Pointing at photos on the menu while saying this is perfectly normal and expected from tourists.',
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'restaurant-2',
    situation: 'restaurant',
    english: 'Water, please',
    japanese: 'お{水|みず}ください',
    romaji: 'omizu kudasai',
    breakdown: 'お水 (omizu) = water (polite) + ください (kudasai) = please give me',
    whenToUse: "Most restaurants serve free water automatically, but ask if they don't",
    culturalNote:
      'Water (and often tea) is free at Japanese restaurants. You never need to order a drink.',
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'restaurant-3',
    situation: 'restaurant',
    english: 'The check, please',
    japanese: 'お{会計|かいけい}お{願|ねが}いします',
    romaji: 'okaikei onegai shimasu',
    breakdown: 'お会計 (okaikei) = the bill/check + お願いします (onegai shimasu) = please',
    whenToUse:
      'When ready to pay. In many restaurants, take the slip to the register near the exit.',
    culturalNote:
      'Splitting the bill is called "betsu-betsu" (別々). Most places handle it without issue.',
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'restaurant-4',
    situation: 'restaurant',
    english: 'Do you have an English menu?',
    japanese: '{英語|えいご}のメニューはありますか？',
    romaji: 'eigo no menyuu wa arimasu ka?',
    breakdown:
      '英語 (eigo) = English + の (no) = possessive + メニュー (menyuu) = menu + ありますか (arimasu ka) = is there?',
    whenToUse:
      'At sit-down restaurants. Many tourist-area restaurants have picture menus or English versions.',
    formality: 'polite',
    difficulty: 2,
  },
  {
    id: 'restaurant-5',
    situation: 'restaurant',
    english: 'It was delicious, thank you',
    japanese: 'ごちそうさまでした',
    romaji: 'gochisousama deshita',
    breakdown: 'ごちそうさまでした (gochisousama deshita) — set phrase said after finishing a meal',
    whenToUse: 'Say this when leaving a restaurant or finishing a meal someone prepared for you',
    culturalNote:
      "Staff will really appreciate hearing this. It's the polite way to end any meal in Japan.",
    formality: 'polite',
    difficulty: 2,
  },
  {
    id: 'restaurant-6',
    situation: 'restaurant',
    english: 'What do you recommend?',
    japanese: 'おすすめは{何|なん}ですか？',
    romaji: 'osusume wa nan desu ka?',
    breakdown:
      'おすすめ (osusume) = recommendation + は (wa) = topic + 何ですか (nan desu ka) = what is?',
    whenToUse: 'Great for smaller restaurants without English menus. Staff love being asked this.',
    formality: 'polite',
    difficulty: 2,
  },
  {
    id: 'restaurant-7',
    situation: 'restaurant',
    english: "I'm allergic to [this]. I can't eat it.",
    japanese: 'アレルギーがあります。これは{食|た}べられません',
    romaji: 'arerugii ga arimasu. kore wa taberaremasen',
    breakdown:
      'アレルギー (arerugii) = allergy + あります (arimasu) = have + 食べられません (taberaremasen) = cannot eat',
    whenToUse:
      'Critical for food allergies. Point at the ingredient or show a card listing your allergies.',
    culturalNote:
      'Consider carrying an allergy card in Japanese. Restaurants take allergies seriously but may not understand spoken English.',
    formality: 'polite',
    difficulty: 3,
  },

  // ─── Shopping ────────────────────────────────────────────────────
  {
    id: 'shopping-0',
    situation: 'shopping',
    english: 'How much is this?',
    japanese: 'これはいくらですか？',
    romaji: 'kore wa ikura desu ka?',
    breakdown:
      'これ (kore) = this + は (wa) = topic + いくら (ikura) = how much + ですか (desu ka) = is?',
    whenToUse: "When an item doesn't have a visible price tag. Point at the item as you ask.",
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'shopping-1',
    situation: 'shopping',
    english: "I'll take this, please",
    japanese: 'これをください',
    romaji: 'kore wo kudasai',
    breakdown: 'これ (kore) = this + を (wo) = object marker + ください (kudasai) = please give me',
    whenToUse: "When you've decided to buy something. Point at it or bring it to the counter.",
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'shopping-2',
    situation: 'shopping',
    english: 'Just looking, thanks',
    japanese: '{見|み}ているだけです',
    romaji: 'mite iru dake desu',
    breakdown: '見ている (mite iru) = looking + だけ (dake) = just/only + です (desu) = am',
    whenToUse: "When staff approach you and you don't need help yet",
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'shopping-3',
    situation: 'shopping',
    english: 'Can I pay by card?',
    japanese: 'カードで{払|はら}えますか？',
    romaji: 'kaado de haraemasu ka?',
    breakdown: 'カード (kaado) = card + で (de) = by/with + 払えますか (haraemasu ka) = can I pay?',
    whenToUse:
      'Before buying, especially at smaller shops. Major chains accept cards but small shops may be cash only.',
    culturalNote:
      'Always carry cash in Japan. Many small restaurants, temples, and markets are cash-only.',
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'shopping-4',
    situation: 'shopping',
    english: 'Tax-free, please',
    japanese: '{免税|めんぜい}でお{願|ねが}いします',
    romaji: 'menzei de onegai shimasu',
    breakdown: '免税 (menzei) = tax-free + で (de) = by + お願いします (onegai shimasu) = please',
    whenToUse:
      'At shops with "Tax Free" signs when spending over ¥5,000. You\'ll need your passport.',
    culturalNote: "Tax-free items are sealed in a bag you shouldn't open until leaving Japan.",
    formality: 'polite',
    difficulty: 2,
  },
  {
    id: 'shopping-5',
    situation: 'shopping',
    english: "I don't need a bag",
    japanese: '{袋|ふくろ}はいりません',
    romaji: 'fukuro wa irimasen',
    breakdown: "袋 (fukuro) = bag + は (wa) = topic + いりません (irimasen) = don't need",
    whenToUse:
      'At checkout — bags cost a few yen in Japan. Staff will often ask "fukuro wa?" at the register.',
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'shopping-6',
    situation: 'shopping',
    english: 'Can I try this on?',
    japanese: '{試着|しちゃく}してもいいですか？',
    romaji: 'shichaku shite mo ii desu ka?',
    breakdown:
      '試着 (shichaku) = fitting/trying on + してもいい (shite mo ii) = is it OK to + ですか (desu ka) = ?',
    whenToUse: 'At clothing stores before using the fitting room',
    culturalNote:
      'You may be asked to remove shoes and given a face cover to protect garments from makeup.',
    formality: 'polite',
    difficulty: 2,
  },
  {
    id: 'shopping-7',
    situation: 'shopping',
    english: 'Do you have a smaller/larger size?',
    japanese: 'もっと{小|ちい}さい／{大|おお}きいサイズはありますか？',
    romaji: 'motto chiisai / ookii saizu wa arimasu ka?',
    breakdown:
      'もっと (motto) = more + 小さい (chiisai) = small / 大きい (ookii) = big + サイズ (saizu) = size + ありますか (arimasu ka) = do you have?',
    whenToUse:
      "When the size on display doesn't fit. Japanese sizing runs smaller than Western sizing.",
    formality: 'polite',
    difficulty: 2,
  },

  // ─── Transport ───────────────────────────────────────────────────
  {
    id: 'transport-0',
    situation: 'transport',
    english: 'Where is the station?',
    japanese: '{駅|えき}はどこですか？',
    romaji: 'eki wa doko desu ka?',
    breakdown:
      '駅 (eki) = station + は (wa) = topic + どこ (doko) = where + ですか (desu ka) = is?',
    whenToUse:
      'When looking for a train station. Most people will point you in the right direction.',
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'transport-1',
    situation: 'transport',
    english: "Excuse me, I'd like to get off",
    japanese: 'すみません、{降|お}ります',
    romaji: 'sumimasen, orimasu',
    breakdown: "すみません (sumimasen) = excuse me + 降ります (orimasu) = I'm getting off",
    whenToUse: 'On a crowded train when you need people to make way for you to exit',
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'transport-2',
    situation: 'transport',
    english: 'Which platform?',
    japanese: '{何番線|なんばんせん}ですか？',
    romaji: 'nanban-sen desu ka?',
    breakdown: '何番 (nanban) = what number + 線 (sen) = line/platform + ですか (desu ka) = is?',
    whenToUse: "At train stations when you're not sure which platform to go to",
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'transport-3',
    situation: 'transport',
    english: 'Does this go to [place]?',
    japanese: 'これは○○に{行|い}きますか？',
    romaji: 'kore wa ○○ ni ikimasu ka?',
    breakdown:
      'これ (kore) = this + は (wa) = topic + に (ni) = to + 行きますか (ikimasu ka) = does it go?',
    whenToUse:
      "On buses or at platforms when unsure if you're on the right line. Replace ○○ with the place name.",
    formality: 'polite',
    difficulty: 2,
  },
  {
    id: 'transport-4',
    situation: 'transport',
    english: 'One ticket to [place], please',
    japanese: '○○まで{一枚|いちまい}お{願|ねが}いします',
    romaji: '○○ made ichimai onegai shimasu',
    breakdown:
      '○○まで (made) = to [place] + 一枚 (ichimai) = one ticket + お願いします (onegai shimasu) = please',
    whenToUse:
      'At ticket counters. For most trains, IC cards (Suica/Pasmo) are easier — just tap and go.',
    culturalNote:
      'Get a Suica or Pasmo IC card at any station. It works on almost all trains, buses, and even vending machines.',
    formality: 'polite',
    difficulty: 2,
  },
  {
    id: 'transport-5',
    situation: 'transport',
    english: 'Is this seat taken?',
    japanese: 'この{席|せき}は{空|あ}いていますか？',
    romaji: 'kono seki wa aite imasu ka?',
    breakdown: 'この席 (kono seki) = this seat + 空いていますか (aite imasu ka) = is it available?',
    whenToUse: 'On long-distance trains or buses with non-reserved seating',
    formality: 'polite',
    difficulty: 2,
  },
  {
    id: 'transport-6',
    situation: 'transport',
    english: 'Where should I transfer?',
    japanese: 'どこで{乗|の}り{換|か}えますか？',
    romaji: 'doko de norikaemasu ka?',
    breakdown:
      'どこ (doko) = where + で (de) = at + 乗り換えます (norikaemasu) = transfer + か (ka) = ?',
    whenToUse: 'When taking multiple lines and unsure where to change trains',
    culturalNote:
      'Google Maps and the Japan Transit app work extremely well for train navigation in Japan.',
    formality: 'polite',
    difficulty: 2,
  },
  {
    id: 'transport-7',
    situation: 'transport',
    english: 'I missed my stop. How do I get back?',
    japanese: '{乗|の}り{過|す}ごしました。{戻|もど}るにはどうすればいいですか？',
    romaji: 'nori sugoshimashita. modoru ni wa dou sureba ii desu ka?',
    breakdown:
      '乗り過ごしました (nori sugoshimashita) = missed my stop + 戻る (modoru) = go back + どうすればいい (dou sureba ii) = what should I do',
    whenToUse: "Ask station staff — they're very helpful and many understand basic English",
    formality: 'polite',
    difficulty: 3,
  },

  // ─── Hotel ───────────────────────────────────────────────────────
  {
    id: 'hotel-0',
    situation: 'hotel',
    english: 'I have a reservation',
    japanese: '{予約|よやく}があります',
    romaji: 'yoyaku ga arimasu',
    breakdown:
      '予約 (yoyaku) = reservation + が (ga) = subject marker + あります (arimasu) = have/exists',
    whenToUse: 'At check-in. Follow with your name or show your booking confirmation.',
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'hotel-1',
    situation: 'hotel',
    english: 'Check-in, please',
    japanese: 'チェックインお{願|ねが}いします',
    romaji: 'chekkuin onegai shimasu',
    breakdown: 'チェックイン (chekkuin) = check-in + お願いします (onegai shimasu) = please',
    whenToUse: 'At the front desk when arriving',
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'hotel-2',
    situation: 'hotel',
    english: 'What time is checkout?',
    japanese: 'チェックアウトは{何時|なんじ}ですか？',
    romaji: 'chekkuauto wa nanji desu ka?',
    breakdown:
      'チェックアウト (chekkuauto) = checkout + 何時 (nanji) = what time + ですか (desu ka) = is?',
    whenToUse: 'At check-in or anytime during your stay. Most hotels are 10am or 11am.',
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'hotel-3',
    situation: 'hotel',
    english: 'Can I leave my luggage here?',
    japanese: '{荷物|にもつ}を{預|あず}けてもいいですか？',
    romaji: 'nimotsu wo azukete mo ii desu ka?',
    breakdown:
      '荷物 (nimotsu) = luggage + 預けても (azukete mo) = even if I leave + いいですか (ii desu ka) = is it OK?',
    whenToUse: 'Before check-in or after checkout when you want to explore without bags',
    culturalNote: 'Most hotels and even many train stations have coin lockers for luggage storage.',
    formality: 'polite',
    difficulty: 2,
  },
  {
    id: 'hotel-4',
    situation: 'hotel',
    english: 'The WiFi password, please',
    japanese: 'WiFiのパスワードを{教|おし}えてください',
    romaji: 'waifai no pasuwaado wo oshiete kudasai',
    breakdown:
      "WiFiの (waifai no) = WiFi's + パスワード (pasuwaado) = password + 教えてください (oshiete kudasai) = please tell me",
    whenToUse: "At check-in if the WiFi info isn't in your room or on the key card holder",
    formality: 'polite',
    difficulty: 2,
  },
  {
    id: 'hotel-5',
    situation: 'hotel',
    english: 'Could I have extra towels?',
    japanese: 'タオルを{追加|ついか}でいただけますか？',
    romaji: 'taoru wo tsuika de itadakemasu ka?',
    breakdown:
      'タオル (taoru) = towel + 追加で (tsuika de) = additionally + いただけますか (itadakemasu ka) = could I receive?',
    whenToUse: 'At the front desk or by calling reception from your room',
    formality: 'very_polite',
    difficulty: 2,
  },
  {
    id: 'hotel-6',
    situation: 'hotel',
    english: "The air conditioning isn't working",
    japanese: 'エアコンが{動|うご}きません',
    romaji: 'eakon ga ugokimasen',
    breakdown:
      "エアコン (eakon) = air conditioner + が (ga) = subject + 動きません (ugokimasen) = isn't working",
    whenToUse:
      'Report to front desk. Also works for other things: テレビ (terebi = TV), シャワー (shawaa = shower).',
    formality: 'polite',
    difficulty: 2,
  },
  {
    id: 'hotel-7',
    situation: 'hotel',
    english: 'Could you call a taxi for me?',
    japanese: 'タクシーを{呼|よ}んでいただけますか？',
    romaji: 'takushii wo yonde itadakemasu ka?',
    breakdown:
      'タクシー (takushii) = taxi + 呼んで (yonde) = call + いただけますか (itadakemasu ka) = could you?',
    whenToUse: 'At the front desk when you need a ride. Hotel staff are happy to arrange this.',
    formality: 'very_polite',
    difficulty: 2,
  },

  // ─── Directions ──────────────────────────────────────────────────
  {
    id: 'directions-0',
    situation: 'directions',
    english: 'Where is the bathroom?',
    japanese: 'トイレはどこですか？',
    romaji: 'toire wa doko desu ka?',
    breakdown:
      'トイレ (toire) = toilet/bathroom + は (wa) = topic + どこ (doko) = where + ですか (desu ka) = is?',
    whenToUse:
      'In restaurants, stations, malls — anywhere. Bathrooms are clean and everywhere in Japan.',
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'directions-1',
    situation: 'directions',
    english: 'Is it far from here?',
    japanese: 'ここから{遠|とお}いですか？',
    romaji: 'koko kara tooi desu ka?',
    breakdown:
      'ここ (koko) = here + から (kara) = from + 遠い (tooi) = far + ですか (desu ka) = is?',
    whenToUse: 'After getting directions to gauge whether to walk or take transport',
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'directions-2',
    situation: 'directions',
    english: 'Straight ahead',
    japanese: 'まっすぐ',
    romaji: 'massugu',
    breakdown: 'まっすぐ (massugu) = straight. Understanding directions given to you.',
    whenToUse:
      'Listen for this when someone gives you directions. Other key words: 右 (migi) = right, 左 (hidari) = left.',
    formality: 'casual',
    difficulty: 1,
  },
  {
    id: 'directions-3',
    situation: 'directions',
    english: 'Can you show me on the map?',
    japanese: '{地図|ちず}で{教|おし}えていただけますか？',
    romaji: 'chizu de oshiete itadakemasu ka?',
    breakdown:
      '地図 (chizu) = map + で (de) = on/with + 教えて (oshiete) = teach/show + いただけますか (itadakemasu ka) = could you?',
    whenToUse: 'Show your phone map and ask. Most people will happily point to the right spot.',
    formality: 'very_polite',
    difficulty: 2,
  },
  {
    id: 'directions-4',
    situation: 'directions',
    english: "I'm looking for this place",
    japanese: 'この{場所|ばしょ}を{探|さが}しています',
    romaji: 'kono basho wo sagashite imasu',
    breakdown:
      'この場所 (kono basho) = this place + を (wo) = object + 探しています (sagashite imasu) = am looking for',
    whenToUse: 'Show the address or name on your phone while saying this',
    formality: 'polite',
    difficulty: 2,
  },
  {
    id: 'directions-5',
    situation: 'directions',
    english: 'Turn right / left at the next corner',
    japanese: '{次|つぎ}の{角|かど}を{右|みぎ}／{左|ひだり}に{曲|ま}がってください',
    romaji: 'tsugi no kado wo migi / hidari ni magatte kudasai',
    breakdown:
      '次の角 (tsugi no kado) = next corner + 右 (migi) = right / 左 (hidari) = left + 曲がってください (magatte kudasai) = please turn',
    whenToUse: 'Useful for understanding directions someone gives you or telling a taxi driver',
    formality: 'polite',
    difficulty: 2,
  },
  {
    id: 'directions-6',
    situation: 'directions',
    english: "I'm lost. Can you help me?",
    japanese: '{道|みち}に{迷|まよ}っています。{助|たす}けていただけますか？',
    romaji: 'michi ni mayotte imasu. tasukete itadakemasu ka?',
    breakdown:
      '道に迷って (michi ni mayotte) = lost on the road + います (imasu) = am + 助けて (tasukete) = help + いただけますか (itadakemasu ka) = could you?',
    whenToUse: 'When genuinely lost. Japanese people are incredibly helpful to lost tourists.',
    culturalNote:
      "Don't be surprised if someone walks you all the way to your destination. It's common.",
    formality: 'very_polite',
    difficulty: 3,
  },
  {
    id: 'directions-7',
    situation: 'directions',
    english: 'How do I get to [place]?',
    japanese: '○○にはどうやって{行|い}きますか？',
    romaji: '○○ ni wa dou yatte ikimasu ka?',
    breakdown:
      '○○には (ni wa) = to [place] + どうやって (dou yatte) = how/by what way + 行きますか (ikimasu ka) = go?',
    whenToUse:
      'Ask at hotel front desks or tourist information centers. Replace ○○ with the place name.',
    formality: 'polite',
    difficulty: 3,
  },

  // ─── Polite Extras ───────────────────────────────────────────────
  {
    id: 'polite-0',
    situation: 'polite',
    english: 'Please (when requesting)',
    japanese: 'お{願|ねが}いします',
    romaji: 'onegai shimasu',
    breakdown:
      'お願い (onegai) = request/favor + します (shimasu) = do. Literally "I make a request."',
    whenToUse: 'After any request — ordering food, asking for help, making purchases',
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'polite-1',
    situation: 'polite',
    english: 'Yes',
    japanese: 'はい',
    romaji: 'hai',
    breakdown: 'はい (hai) — affirmative. Can also mean "I\'m listening" or "go ahead."',
    whenToUse:
      'In conversation. Note: Japanese people say "hai" while listening — it means "I hear you," not necessarily "I agree."',
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'polite-2',
    situation: 'polite',
    english: "I don't understand",
    japanese: 'わかりません',
    romaji: 'wakarimasen',
    breakdown:
      "わかりません (wakarimasen) = don't understand. Negative of わかります (wakarimasu).",
    whenToUse:
      "When someone speaks Japanese to you and you can't follow. Usually they'll try another way.",
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'polite-3',
    situation: 'polite',
    english: "It's OK / I'm fine / No thanks",
    japanese: '{大丈夫|だいじょうぶ}です',
    romaji: 'daijoubu desu',
    breakdown: '大丈夫 (daijoubu) = alright/OK + です (desu) = is',
    whenToUse: "Multi-purpose: decline an offer, say you're fine, or confirm something is OK",
    culturalNote:
      'This phrase does incredible work. "Need a bag?" 大丈夫です. "Are you OK?" 大丈夫です. "More water?" 大丈夫です.',
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'polite-4',
    situation: 'polite',
    english: 'One moment, please',
    japanese: 'ちょっと{待|ま}ってください',
    romaji: 'chotto matte kudasai',
    breakdown: 'ちょっと (chotto) = a little + 待って (matte) = wait + ください (kudasai) = please',
    whenToUse: 'When you need a moment to look at a menu, check your phone, or think',
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'polite-5',
    situation: 'polite',
    english: "I don't speak Japanese",
    japanese: '{日本語|にほんご}が{話|はな}せません',
    romaji: 'nihongo ga hanasemasen',
    breakdown:
      "日本語 (nihongo) = Japanese language + が (ga) = subject + 話せません (hanasemasen) = can't speak",
    whenToUse:
      'When someone starts a longer conversation in Japanese and you need to let them know',
    formality: 'polite',
    difficulty: 2,
  },
  {
    id: 'polite-6',
    situation: 'polite',
    english: 'Could you speak more slowly?',
    japanese: 'もっとゆっくり{話|はな}していただけますか？',
    romaji: 'motto yukkuri hanashite itadakemasu ka?',
    breakdown:
      'もっと (motto) = more + ゆっくり (yukkuri) = slowly + 話して (hanashite) = speak + いただけますか (itadakemasu ka) = could you?',
    whenToUse: 'When someone is trying to help but speaking too fast for you to catch any words',
    formality: 'very_polite',
    difficulty: 2,
  },
  {
    id: 'polite-7',
    situation: 'polite',
    english: 'Could you write it down?',
    japanese: '{書|か}いていただけますか？',
    romaji: 'kaite itadakemasu ka?',
    breakdown: '書いて (kaite) = write + いただけますか (itadakemasu ka) = could you?',
    whenToUse:
      'When someone tells you a place name or address and you want to show it to a taxi driver later',
    culturalNote:
      'Many Japanese people who are shy about speaking English can read/write it well. Written communication often works better.',
    formality: 'very_polite',
    difficulty: 2,
  },

  // ─── Numbers ─────────────────────────────────────────────────────
  {
    id: 'numbers-0',
    situation: 'numbers',
    english: 'One person / Two people',
    japanese: '{一人|ひとり} ／ {二人|ふたり}',
    romaji: 'hitori / futari',
    breakdown:
      '一人 (hitori) = 1 person + 二人 (futari) = 2 people. Irregular readings — these are the most common.',
    whenToUse:
      'At restaurants when asked how many. Three people = 三人 (sannin), four = 四人 (yonin).',
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'numbers-1',
    situation: 'numbers',
    english: 'One / Two / Three',
    japanese: '{一|ひと}つ ／ {二|ふた}つ ／ {三|みっ}つ',
    romaji: 'hitotsu / futatsu / mittsu',
    breakdown:
      'Native Japanese counting for general items: 一つ (hitotsu), 二つ (futatsu), 三つ (mittsu)',
    whenToUse: 'When ordering quantities of things. Hold up fingers too — universally understood.',
    culturalNote:
      'Japanese has many counting systems but hitotsu/futatsu/mittsu works for almost anything as a tourist.',
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'numbers-2',
    situation: 'numbers',
    english: '1-10 in Japanese',
    japanese: 'いち、に、さん、し／よん、ご、ろく、しち／なな、はち、きゅう、じゅう',
    romaji: 'ichi, ni, san, shi/yon, go, roku, shichi/nana, hachi, kyuu, juu',
    breakdown:
      '1=いち 2=に 3=さん 4=し or よん 5=ご 6=ろく 7=しち or なな 8=はち 9=きゅう 10=じゅう',
    whenToUse: 'Useful for understanding prices, platform numbers, and floor numbers',
    culturalNote:
      '4 (shi) sounds like "death" and 9 (ku) like "suffering" — hotels often skip room 4 and floor 4.',
    formality: 'casual',
    difficulty: 1,
  },
  {
    id: 'numbers-3',
    situation: 'numbers',
    english: 'How much is it?',
    japanese: 'いくらですか？',
    romaji: 'ikura desu ka?',
    breakdown: 'いくら (ikura) = how much + ですか (desu ka) = is it?',
    whenToUse: 'When you need to know a price. Listen for the number + 円 (en = yen).',
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'numbers-4',
    situation: 'numbers',
    english: '100 / 1,000 / 10,000 yen',
    japanese: '{百|ひゃく}{円|えん} ／ {千|せん}{円|えん} ／ {一万|いちまん}{円|えん}',
    romaji: 'hyaku-en / sen-en / ichiman-en',
    breakdown: '百 (hyaku) = 100 + 千 (sen) = 1,000 + 一万 (ichiman) = 10,000 + 円 (en) = yen',
    whenToUse:
      'Key price points: vending drinks ~150円, convenience store lunch ~500円, nice dinner ~3,000-5,000円',
    culturalNote:
      '¥10,000 notes are the largest bill. ¥100 ≈ $0.65 USD (but rates vary). Japan is still heavily cash-based.',
    formality: 'casual',
    difficulty: 1,
  },
  {
    id: 'numbers-5',
    situation: 'numbers',
    english: 'What time is it?',
    japanese: '{今|いま}{何時|なんじ}ですか？',
    romaji: 'ima nanji desu ka?',
    breakdown: '今 (ima) = now + 何時 (nanji) = what time + ですか (desu ka) = is?',
    whenToUse: 'Hours use ～時 (ji): 1時 (ichiji), 2時 (niji), etc. Minutes use ～分 (fun/pun).',
    formality: 'polite',
    difficulty: 2,
  },
  {
    id: 'numbers-6',
    situation: 'numbers',
    english: 'What floor?',
    japanese: '{何階|なんかい}ですか？',
    romaji: 'nan-kai desu ka?',
    breakdown: '何 (nan) = what + 階 (kai) = floor + ですか (desu ka) = is?',
    whenToUse:
      'In department stores and malls. Floors: 1階 (ikkai), 2階 (nikai), 3階 (sangai), 地下 (chika) = basement.',
    formality: 'polite',
    difficulty: 2,
  },
  {
    id: 'numbers-7',
    situation: 'numbers',
    english: 'The date: month and day',
    japanese: '○{月|がつ}○{日|にち}',
    romaji: '○-gatsu ○-nichi',
    breakdown:
      'Months = number + 月 (gatsu): 1月 (ichigatsu) = January. Days = number + 日 (nichi), with irregular readings for 1st-10th.',
    whenToUse: 'For booking, reservations, or understanding dates on tickets and signs',
    culturalNote: 'Japan uses Year/Month/Day order. 2026年5月3日 = May 3, 2026.',
    formality: 'polite',
    difficulty: 2,
  },

  // ─── Emergency ───────────────────────────────────────────────────
  {
    id: 'emergency-0',
    situation: 'emergency',
    english: 'Help!',
    japanese: '{助|たす}けて！',
    romaji: 'tasukete!',
    breakdown: '助けて (tasukete) = help me! — imperative form of 助ける (tasukeru)',
    whenToUse:
      'In any emergency. Shouting this will get immediate attention from people around you.',
    formality: 'casual',
    difficulty: 1,
  },
  {
    id: 'emergency-1',
    situation: 'emergency',
    english: 'I feel sick',
    japanese: '{具合|ぐあい}が{悪|わる}いです',
    romaji: 'guai ga warui desu',
    breakdown:
      '具合 (guai) = condition + が (ga) = subject + 悪い (warui) = bad + です (desu) = is',
    whenToUse: 'At a hotel, pharmacy, or when seeking medical help',
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'emergency-2',
    situation: 'emergency',
    english: 'It hurts here',
    japanese: 'ここが{痛|いた}いです',
    romaji: 'koko ga itai desu',
    breakdown: 'ここ (koko) = here + が (ga) = subject + 痛い (itai) = painful + です (desu) = is',
    whenToUse: 'Point to where it hurts while saying this to a doctor or pharmacist',
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'emergency-3',
    situation: 'emergency',
    english: 'Where is the hospital?',
    japanese: '{病院|びょういん}はどこですか？',
    romaji: 'byouin wa doko desu ka?',
    breakdown:
      '病院 (byouin) = hospital + は (wa) = topic + どこ (doko) = where + ですか (desu ka) = is?',
    whenToUse:
      'In a medical emergency. For minor issues, a pharmacy (薬局 yakkyoku) may be enough.',
    culturalNote:
      'Emergency number in Japan is 119 for ambulance/fire and 110 for police. English support is available.',
    formality: 'polite',
    difficulty: 1,
  },
  {
    id: 'emergency-4',
    situation: 'emergency',
    english: 'Please call an ambulance',
    japanese: '{救急車|きゅうきゅうしゃ}を{呼|よ}んでください',
    romaji: 'kyuukyuusha wo yonde kudasai',
    breakdown:
      '救急車 (kyuukyuusha) = ambulance + を (wo) = object + 呼んで (yonde) = call + ください (kudasai) = please',
    whenToUse: 'In a serious medical emergency. You can also dial 119 directly.',
    formality: 'polite',
    difficulty: 2,
  },
  {
    id: 'emergency-5',
    situation: 'emergency',
    english: 'Please call the police',
    japanese: '{警察|けいさつ}を{呼|よ}んでください',
    romaji: 'keisatsu wo yonde kudasai',
    breakdown:
      '警察 (keisatsu) = police + を (wo) = object + 呼んで (yonde) = call + ください (kudasai) = please',
    whenToUse: "If you're a victim of theft or feel unsafe. Police dial: 110.",
    culturalNote:
      'Japan is extremely safe, but police boxes (交番 koban) are everywhere and officers are very helpful — even for directions.',
    formality: 'polite',
    difficulty: 2,
  },
  {
    id: 'emergency-6',
    situation: 'emergency',
    english: 'I lost my passport',
    japanese: 'パスポートをなくしました',
    romaji: 'pasupooto wo nakushimashita',
    breakdown:
      'パスポート (pasupooto) = passport + を (wo) = object + なくしました (nakushimashita) = lost',
    whenToUse:
      'At a police box (koban) or your embassy. File a report so you can get a replacement.',
    culturalNote:
      'Go to the nearest koban first, then contact your embassy. Keep a photo of your passport on your phone.',
    formality: 'polite',
    difficulty: 2,
  },
  {
    id: 'emergency-7',
    situation: 'emergency',
    english: 'I need a doctor who speaks English',
    japanese: '{英語|えいご}が{話|はな}せる{医者|いしゃ}をお{願|ねが}いします',
    romaji: 'eigo ga hanaseru isha wo onegai shimasu',
    breakdown:
      '英語が話せる (eigo ga hanaseru) = can speak English + 医者 (isha) = doctor + お願いします (onegai shimasu) = please',
    whenToUse: 'At a hospital or ask your hotel to help find an English-speaking clinic',
    culturalNote:
      'Major cities have international clinics. Your hotel concierge is the fastest way to find one.',
    formality: 'polite',
    difficulty: 3,
  },
];
