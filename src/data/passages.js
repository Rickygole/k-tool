/**
 * Assessment passages. Every one is original text written for this project. Nothing is
 * lifted from a published reading program, because those are copyrighted and because a
 * benchmark passage that has already been taught is not a benchmark.
 *
 * There is at least one passage per grade from kindergarten through twelve. Length scales with
 * the grade for a reason: the whole measure is words read correctly in about a minute, so a
 * kindergarten passage of a hundred words would just be a hundred words the child never reaches.
 * Thirty odd words at K, around a hundred and thirty by high school.
 *
 * Constraints they are written to, which are load-bearing rather than stylistic:
 *
 *   - Length matched to the grade. Long enough that WCPM is not dominated by one stumble,
 *     short enough that the reader actually gets through most of it inside a minute.
 *   - No digits. `normalize.expandNumbers` rewrites "5" to "five" before tokenising, so a
 *     numeral in the source would render in the marked-up passage as its spelled-out form and
 *     no longer match the printed page. Spell numbers out here instead.
 *   - No hyphenated compounds. `normalize.tokenize` splits on hyphens (correctly. A reader
 *     says two words), which would drop the hyphen from the marked-up rendering.
 *   - One paragraph. The scorer returns a flat token list, so the marked-up passage reflows as
 *     a single block; a paragraph break in the source would silently disappear on the results
 *     screen.
 *
 * Contractions ARE used deliberately. They expand to two tokens internally ("isn't" -> "is
 * not") and the results view has to regroup them back into one printed word. So keeping one
 * in the set means that path is exercised every time anyone reads passage three.
 *
 * Grade levels are the author's judgement against typical sentence length and vocabulary, not
 * a computed readability score. A shipped product would run Lexile or ATOS on these.
 */

/**
 * @typedef {Object} Passage
 * @property {string} id
 * @property {string} title
 * @property {number} grade      grade level the text is written for; drives norm lookup
 * @property {string} text
 * @property {string} blurb      one line of teacher-facing description
 */

/** @type {Passage[]} */
export const PASSAGES = [
  {
    id: 'p1',
    title: 'The Mitten in the Oak Tree',
    grade: 2,
    blurb: 'Short sentences, common sight words, one small surprise.',
    text:
      'Nora lost her red mitten on the way to school. She looked under the bench and behind ' +
      'the big oak tree, but the mitten was gone. All morning she thought about it. When the ' +
      'bell rang for recess, she ran outside and saw a small brown bird carrying something ' +
      'red up to a branch. The bird was building a nest, and her mitten was part of it. Nora ' +
      'laughed out loud. She did not want to climb the tree. She told her teacher that the ' +
      'bird needed the mitten more than she did, and then she went to play.',
  },
  {
    id: 'p2',
    title: 'Rain on the Roof',
    grade: 2,
    blurb: 'Sensory description, repeated sentence patterns, calm ending.',
    text:
      'Rain came down hard on the roof of the school. Sam did not like the sound. It was too ' +
      'loud, and it made his ears feel tight. His teacher gave him a quiet corner near the ' +
      'window with a soft blue pillow. Sam sat there and watched the water run down the glass ' +
      'in little rivers. He counted the rivers until the noise felt smaller. After a while ' +
      'the rain slowed and then it stopped. The sun came back. Sam went outside with his ' +
      'class and found a puddle shaped exactly like a boat.',
  },
  {
    id: 'p3',
    title: 'The Bakery on Ash Street',
    grade: 3,
    blurb: 'Longer clauses, a contraction, and one tricky word: "o’clock".',
    text:
      'Every Saturday morning, Mateo helps his grandmother at the bakery on Ash Street. He ' +
      'arrives before the sun is up, when the ovens are still cold and the floor is still ' +
      'dark. His job is to weigh the flour and to fold the towels into neat squares. His ' +
      'grandmother says the bread will not rise if the kitchen is a mess. Mateo isn’t sure ' +
      'that is true, but he keeps the counters clean anyway. By seven o’clock the whole ' +
      'street smells like warm butter, and people are waiting outside the door.',
  },
  {
    id: 'p4',
    title: 'The Moth at the Window',
    grade: 3,
    blurb: 'Multisyllable words, a cause-and-effect turn near the end.',
    text:
      'A gray moth landed on the window screen and stayed there all evening. Priya watched it ' +
      'from the kitchen table while she finished her homework. The moth did not move, even ' +
      'when the wind pushed the branches around. Her father said that moths follow the moon, ' +
      'and that porch lights confuse them. Priya turned off the porch light to see what would ' +
      'happen. For a long minute nothing changed. Then the moth lifted away into the dark ' +
      'yard, and Priya felt glad and a little sorry at the same time. She left the light off ' +
      'all night.',
  },
  {
    id: 'p5',
    title: 'Tide Pools at Low Water',
    grade: 4,
    blurb: 'Content vocabulary, embedded clauses, an inference in the last line.',
    text:
      'The tide pools appear only twice a day, when the ocean pulls back and leaves shallow ' +
      'bowls of water behind in the rock. Our teacher told the class to walk slowly and to ' +
      'keep our hands out of the water. In the first pool we found a green anemone folded ' +
      'shut like a fist. In the second we found a crab no bigger than a thumbnail, moving ' +
      'sideways under a curtain of seaweed. Everything living there survives being covered ' +
      'and uncovered twice every single day. That is a harder life than it looks from the ' +
      'path above.',
  },
  {
    id: 'k',
    title: 'My Cat Naps',
    grade: 0,
    blurb: 'Sight words and short sentences. About thirty words.',
    text:
      'The cat sat on my bed. She is soft and warm. I pet her back. She likes that a lot. Then ' +
      'she went to nap in the sun by the big red chair.',
  },
  {
    id: 'g1',
    title: 'Sam and Pip',
    grade: 1,
    blurb: 'Simple sentences, common words. Around fifty five words.',
    text:
      'Sam has a little dog named Pip. Every day after school they run to the park. Pip likes to ' +
      'chase the ball, but he will not bring it back. Sam has to run after him. When they get ' +
      'home, Sam gives Pip water and a snack. Then they both sit down on the step and rest.',
  },
  {
    id: 'g5',
    title: "The Keeper's Journal",
    grade: 5,
    blurb: 'Longer clauses and multisyllable vocabulary. Around one hundred and fifteen words.',
    text:
      'The lighthouse keeper kept a journal for thirty years, and every entry began with the ' +
      'weather. Most days were ordinary. Fog rolled in from the north, or the wind picked up by ' +
      'afternoon, or nothing happened at all worth recording. But on one page in the middle of ' +
      'the third volume, the handwriting changes. It becomes hurried and much larger. A ship had ' +
      'come too close to the rocks during a storm, and the keeper had rowed out twice in the ' +
      'dark to bring the crew ashore. He wrote four pages that night. The next morning he ' +
      'returned to his usual habit, noting the temperature and the tide, as though nothing ' +
      'unusual had happened.',
  },
  {
    id: 'g6',
    title: 'The Ice Trade',
    grade: 6,
    blurb: 'Expository text with technical vocabulary. Around one hundred and thirty words.',
    text:
      'Before refrigeration, entire towns depended on ice cut from frozen lakes in winter. Crews ' +
      'worked through January with saws and horses, carving the surface into enormous blocks and ' +
      'hauling them to icehouses packed with sawdust. If the insulation was done properly, a ' +
      'block cut in February would still be solid the following August. The whole industry ' +
      'rested on an unlikely property of sawdust, which traps air so effectively that ice ' +
      'surrounded by it melts astonishingly slowly. Fortunes were made and lost on the thickness ' +
      'of a lake in a single cold season. When mechanical refrigeration arrived, the trade ' +
      'vanished within a generation, and the icehouses were pulled down or converted into barns. ' +
      'Almost nothing remains of it now except the occasional stone foundation near a shoreline.',
  },
  {
    id: 'g7',
    title: 'What the Maps Left Out',
    grade: 7,
    blurb: 'Abstract argument and subordinate clauses. Around one hundred and thirty five words.',
    text:
      'For most of the eighteenth century, mapmakers filled unknown territory with decoration. ' +
      'Coastlines that had actually been surveyed were drawn with precision, and everything ' +
      'beyond them was populated with mountains nobody had climbed and rivers nobody had ' +
      'followed. This was not dishonesty so much as convention. A blank space looked like ' +
      'carelessness, and a decorated one looked like knowledge. The shift came when a handful of ' +
      'cartographers began leaving the interior deliberately empty, marking only what had been ' +
      'measured. Contemporaries found the new maps unsettling and considerably less beautiful. ' +
      'But an empty space is an argument. It tells the reader precisely where the evidence ' +
      'stops, and it invites somebody to go and fill it in properly rather than trusting an ' +
      'illustration.',
  },
  {
    id: 'g8',
    title: 'The Longitude Problem',
    grade: 8,
    blurb: 'Historical exposition with abstract reasoning. Around one hundred and thirty five words.',
    text:
      'Determining latitude at sea was straightforward for centuries, requiring only the angle ' +
      'of the sun at noon. Longitude was another matter entirely, and it killed a great many ' +
      'sailors. The underlying problem was time. Since the earth rotates at a predictable rate, ' +
      'a navigator who knew the hour at a fixed reference point could calculate how far east or ' +
      'west the ship had travelled. But no clock existed that could keep accurate time aboard a ' +
      'rolling vessel through changes in temperature and humidity. Astronomers proposed ' +
      'elaborate solutions involving the moons of Jupiter. The eventual answer came instead from ' +
      'a carpenter with no formal scientific training, who spent decades building a sequence of ' +
      'clocks until one of them finally kept time well enough to be trusted.',
  },
  {
    id: 'g9',
    title: 'The Overlooked Variable',
    grade: 9,
    blurb: 'Complex syntax and abstract argument. Around one hundred and forty words.',
    text:
      'In the middle of the nineteenth century a physician in Vienna noticed that women ' +
      'delivering babies in one ward of his hospital died at several times the rate of those in ' +
      'another. The wards were otherwise identical in ventilation, diet, and crowding, which ' +
      'were the explanations medicine favoured at the time. The difference he eventually ' +
      'isolated was that one ward was staffed by physicians who arrived directly from performing ' +
      'autopsies, and the other by midwives who did not. His proposed remedy, washing hands in a ' +
      'chlorine solution, reduced mortality dramatically and was rejected by nearly all of his ' +
      'colleagues. The theory that would eventually explain why it worked was still decades ' +
      'away, and a correct observation without a mechanism to justify it turns out to persuade ' +
      'almost nobody.',
  },
  {
    id: 'g10',
    title: 'The Cost of Precision',
    grade: 10,
    blurb: 'Analytical prose with embedded clauses. Around one hundred and forty five words.',
    text:
      'Every measurement carries an error, and a great deal of scientific practice consists of ' +
      'deciding how much error is tolerable. This is less obvious than it sounds. A quantity ' +
      'measured to an unnecessary number of decimal places consumes resources that could have ' +
      'been spent measuring something else, and it can create a false impression of certainty in ' +
      'results that remain fundamentally approximate. The reverse failure is more familiar and ' +
      'more dangerous. Instruments calibrated too coarsely will report consistent numbers that ' +
      'are consistently wrong, and because they are consistent, the error is difficult to ' +
      'detect. Experienced researchers therefore treat the question of precision as a design ' +
      'decision rather than a technical detail, and they answer it before collecting anything at ' +
      'all rather than afterwards when the data is already in hand.',
  },
  {
    id: 'g11',
    title: 'Reading the Rings',
    grade: 11,
    blurb: 'Sustained reasoning and technical vocabulary. Around one hundred and forty five words.',
    text:
      'A cross section of an old tree contains a climate record that can be read with reasonable ' +
      'confidence, because a tree in a favourable year lays down a wider ring than a tree in a ' +
      'poor one. The technique becomes powerful when samples overlap. A living tree provides a ' +
      'sequence extending back through its own lifetime, and timber from an old building whose ' +
      'outer rings match the inner rings of the living sample extends the record further. ' +
      'Chained carefully, such sequences reach back thousands of years. What makes the method ' +
      'persuasive is not any single sample but the requirement that independent sequences agree ' +
      'with one another. A pattern appearing in one tree might be local circumstance. The same ' +
      'pattern appearing in hundreds, across a region, is a climate.',
  },
  {
    id: 'g12',
    title: 'The Limits of the Instrument',
    grade: 12,
    blurb: 'Sophisticated abstraction and layered syntax. Around one hundred and fifty words.',
    text:
      'Any instrument shapes the questions that can be asked of it, and this is not a defect to ' +
      'be engineered away but a permanent condition of measurement. A telescope sensitive to ' +
      'visible light will produce an account of the universe composed entirely of objects that ' +
      'emit visible light, and for a long period that account was mistaken for the universe ' +
      'itself. The correction did not come from building better optical telescopes. It came from ' +
      'instruments responding to radio waves, and later to other wavelengths, each revealing a ' +
      'population of objects the previous generation of equipment had been structurally ' +
      'incapable of detecting. The lesson generalises well beyond astronomy. Whenever a field ' +
      'appears to have converged on a stable description of its subject, it is worth asking ' +
      'which properties the available instruments cannot register at all.',
  },
  {
    id: 'k2',
    title: 'The Big Red Ball',
    grade: 0,
    blurb: 'Sight words and short sentences.',
    text:
      'My ball is big and red. I kick it in the yard. It goes up and up. Then it lands in the ' +
      'tall grass. I run to get it. My dog runs too. He gets there first.',
  },
  {
    id: 'k3',
    title: 'Mom and Me',
    grade: 0,
    blurb: 'Sight words and short sentences.',
    text:
      'On Sunday my mom and I make eggs. She cracks them in the pan. I stir with a big spoon. ' +
      'We put them on two plates. Then we sit and eat by the window.',
  },
  {
    id: 'k4',
    title: 'Ducks at the Pond',
    grade: 0,
    blurb: 'Sight words and short sentences.',
    text:
      'We walk to the pond. Six ducks swim there. They dip their heads in the water. One duck ' +
      'comes close to us. He wants some bread. We do not have any today.',
  },
  {
    id: 'k5',
    title: 'I Can Help',
    grade: 0,
    blurb: 'Sight words and short sentences.',
    text:
      'I can help my dad. I put the socks in a pile. I set the cups on the shelf. I am too ' +
      'small to reach the top. So dad lifts me up and I do it.',
  },
  {
    id: 'g1b',
    title: 'The Lost Sock',
    grade: 1,
    blurb: 'Simple sentences, everyday vocabulary.',
    text:
      'Every week one sock goes missing. Mom says the machine eats them. I do not think a ' +
      'machine can eat. So one day I looked behind it. There was a pile of socks back there, ' +
      "all covered in dust. I found four of mine and two of my brother's. Mom laughed when I " +
      'showed her.',
  },
  {
    id: 'g1c',
    title: 'Rain Day',
    grade: 1,
    blurb: 'Simple sentences, everyday vocabulary.',
    text:
      'It rained all day so we could not go outside. Our teacher pushed the desks back and let ' +
      'us sit on the floor. She read us a long story about a bear who could not sleep. When it ' +
      'was over, the sun came out. We got to go to the field for the last ten minutes.',
  },
  {
    id: 'g1d',
    title: 'The New Kid',
    grade: 1,
    blurb: 'Simple sentences, everyday vocabulary.',
    text:
      'A new kid came to our class today. His name is Omar and he just moved here. He did not ' +
      'talk much at first. At lunch I sat next to him and asked if he liked soccer. He said ' +
      'yes. So we played at recess and now he talks a lot.',
  },
  {
    id: 'g1e',
    title: "Grandpa's Garden",
    grade: 1,
    blurb: 'Simple sentences, everyday vocabulary.',
    text:
      'My grandpa grows beans in his back garden. He gave me my own row to look after. I water ' +
      'it every time we visit. At first nothing happened and I thought I did it wrong. Then ' +
      'one day there were tiny green shoots. Grandpa said I just had to wait. He was right.',
  },
  {
    id: 'g2c',
    title: 'The Snow Fort',
    grade: 2,
    blurb: 'Short narrative, familiar words.',
    text:
      'It snowed all night, and by morning the drifts were up to the fence. My sister and I ' +
      'put on our boots and went out before breakfast. We piled the snow into walls and packed ' +
      'it down hard with our hands. It took most of the morning. When we finally crawled ' +
      'inside, it was quiet in there, and warmer than we expected. We stayed until our mother ' +
      'called us in for lunch. By the next afternoon the sun had softened the walls and one ' +
      'side had fallen in, but we did not mind.',
  },
  {
    id: 'g2d',
    title: "Marco's Bike",
    grade: 2,
    blurb: 'Short narrative, familiar words.',
    text:
      'Marco got a bike for his birthday, but he did not know how to ride it. His father held ' +
      'the back of the seat and ran beside him down the sidewalk. Marco wobbled and stopped ' +
      'and started again. He did this every evening for a week. On Saturday his father let go ' +
      'without telling him. Marco rode all the way to the corner before he noticed he was ' +
      'alone. He was so surprised that he forgot to brake and rolled into the hedge. He was ' +
      'not hurt, and he got right back on.',
  },
  {
    id: 'g2e',
    title: 'The Class Pet',
    grade: 2,
    blurb: 'Short narrative, familiar words.',
    text:
      'Our class has a rabbit named Biscuit who lives in a cage by the window. Every Friday ' +
      'one student gets to take him home for the weekend. When it was my turn, I was careful ' +
      'to keep the door shut and to give him fresh water twice a day. He mostly slept. On ' +
      'Sunday he finally came out and hopped around the kitchen. My mother said he could stay ' +
      'in the corner as long as he did not chew the chairs. He chewed one chair. We brought ' +
      'him back on Monday anyway.',
  },
  {
    id: 'g3c',
    title: 'The Kite That Got Away',
    grade: 3,
    blurb: 'Narrative with longer sentences.',
    text:
      'The wind on the hill was stronger than it looked from the parking lot. Dev let out the ' +
      'string a little at a time, the way his uncle had shown him, until the kite was a small ' +
      'orange diamond high above the field. Then a gust came through and the string snapped ' +
      'clean. The kite kept climbing for a moment, and then it drifted sideways over the trees ' +
      'and disappeared. Dev stood there holding the empty spool. His uncle did not say ' +
      'anything for a while. Then he said that was the highest either of them had ever flown ' +
      'one, and they should probably build another.',
  },
  {
    id: 'g3d',
    title: 'Anna Learns to Swim',
    grade: 3,
    blurb: 'Narrative with longer sentences.',
    text:
      'Anna had been afraid of the deep end since she was five. Every summer she stayed near ' +
      'the steps while the other children jumped off the side. The summer she turned nine, her ' +
      'mother signed her up for lessons on Tuesday mornings. The instructor never made her ' +
      'jump. Instead he had her float on her back with his hand under her shoulders, and then ' +
      'with his hand a little further away, and then not at all. It took six weeks. On the ' +
      'last day she swam the whole length of the pool without stopping once.',
  },
  {
    id: 'g3e',
    title: 'The Old Piano',
    grade: 3,
    blurb: 'Narrative with longer sentences.',
    text:
      'Nobody in the house could play the piano in the front room, but nobody wanted to get ' +
      'rid of it either. It had belonged to my great grandmother, and two of its keys did not ' +
      'make a sound. Sometimes my brother would sit down and press them anyway, listening to ' +
      'the silence where the notes should be. Last spring a tuner came to look at it. He ' +
      'worked for three hours and charged us very little. When he was finished he played ' +
      'something short and quick, and the whole room sounded different than it had before.',
  },
  {
    id: 'g4b',
    title: 'The Beekeeper',
    grade: 4,
    blurb: 'Informational text, some technical words.',
    text:
      'The beekeeper who visited our school brought a frame of honeycomb inside a glass case ' +
      'so we could watch without being stung. She explained that a hive is not really a ' +
      'collection of individual insects but something closer to a single organism, since no ' +
      'bee survives long on its own. When a worker finds a good patch of flowers, she returns ' +
      'and dances in a pattern that tells the others both the direction and the distance. ' +
      'Nobody taught her this. What surprised us most was how gentle the beekeeper was. She ' +
      'said bees only sting when they think the hive is threatened, and mostly they are far ' +
      'too busy.',
  },
  {
    id: 'g4c',
    title: 'After Hours at the Museum',
    grade: 4,
    blurb: 'Informational text, some technical words.',
    text:
      'The night guard at the natural history museum walks the same route every evening after ' +
      'the visitors leave. He says the building sounds completely different when it is empty. ' +
      'The floors settle, the heating pipes tick, and the enormous skeleton in the main hall ' +
      'throws a shadow across the ceiling that moves as he passes with his flashlight. He has ' +
      'worked there eleven years. His favourite room is the one with the meteorites, because ' +
      'the largest of them fell in Argentina long before anyone was there to see it, and it ' +
      'sat in the ground for thousands of years before someone dug it up.',
  },
  {
    id: 'g4d',
    title: 'The Storm Drain',
    grade: 4,
    blurb: 'Informational text, some technical words.',
    text:
      'After the heavy rain, water ran along the gutter and disappeared into the storm drain ' +
      'at the corner. My cousin and I crouched down and listened to it falling somewhere ' +
      'below. She wanted to know where it went. Her father, who works for the city, explained ' +
      'that the drains lead to a series of pipes under the streets and then out to the creek ' +
      'behind the school. He said people sometimes pour paint or oil down them, thinking it ' +
      'goes somewhere harmless, and it ends up in the creek exactly the way the rain does.',
  },
  {
    id: 'g4e',
    title: 'Learning to Sail',
    grade: 4,
    blurb: 'Informational text, some technical words.',
    text:
      'The first thing they teach you about sailing is that you cannot go straight into the ' +
      'wind. This seems like a serious problem until you understand the solution, which is to ' +
      'go at an angle, then turn and go at the opposite angle, zigzagging your way forward. It ' +
      'takes longer, but it works. My instructor said most beginners fight the boat, hauling ' +
      'on ropes and trying to force it where they want. The trick is to feel which way the ' +
      'wind is already pushing and use that. By the end of the week I could get across the bay ' +
      'without help.',
  },
  {
    id: 'g5b',
    title: 'The Seed Library',
    grade: 5,
    blurb: 'Subordinate clauses, multisyllable vocabulary.',
    text:
      'In one small town the public library lends out more than books. In a wooden cabinet ' +
      'near the front desk, hundreds of paper envelopes hold seeds donated by local gardeners, ' +
      'sorted by vegetable and by year. Anyone with a library card may take a few. The only ' +
      'condition is that if the plants do well, you save some seed at the end of the season ' +
      'and bring it back. Over time this produces something a shop cannot sell, because the ' +
      'seeds that keep returning are the ones that actually thrive in that particular soil and ' +
      'climate. The collection slowly becomes better adapted to the place it came from.',
  },
  {
    id: 'g5c',
    title: 'Crossing the Desert',
    grade: 5,
    blurb: 'Subordinate clauses, multisyllable vocabulary.',
    text:
      'Camels are often described as storing water in their humps, which is not quite right. ' +
      'The humps hold fat, and the fat is fuel rather than drink. What allows a camel to cross ' +
      'a desert is a whole collection of smaller adaptations working together. Its body ' +
      'temperature is permitted to rise several degrees during the day, so it does not need to ' +
      'sweat as early. Its nostrils recapture moisture from each breath before it escapes. Its ' +
      'blood cells are shaped so they keep flowing even when the animal is severely ' +
      'dehydrated. No single feature explains it. The animal survives because a dozen ordinary ' +
      'things are each slightly unusual.',
  },
  {
    id: 'g5d',
    title: 'The Sound of Bats',
    grade: 5,
    blurb: 'Subordinate clauses, multisyllable vocabulary.',
    text:
      'A bat flying through a dark room is navigating by echo. It produces a stream of clicks, ' +
      'far above the range of human hearing, and builds a picture of its surroundings from the ' +
      'pattern of sound returning to its ears. The system is precise enough to catch a moth in ' +
      'flight. What makes it remarkable is the timing. The bat must ignore its own shout and ' +
      'listen for a whisper arriving a few thousandths of a second later. Some moths have ' +
      'evolved a defence, a coating of fine scales that absorbs the clicks rather than ' +
      'reflecting them, so the bat hears almost nothing at all.',
  },
  {
    id: 'g5e',
    title: 'The Bridge Builder',
    grade: 5,
    blurb: 'Subordinate clauses, multisyllable vocabulary.',
    text:
      'When the engineer was asked why she had specified far more steel than her calculations ' +
      'required, she said the calculations assumed everything would be built exactly as drawn. ' +
      'In practice, she explained, a bolt is occasionally over tightened, a weld is ' +
      'occasionally hurried, and concrete is occasionally poured on a colder day than anyone ' +
      'planned for. The extra material is not there for the bridge she designed. It is there ' +
      'for the bridge that actually gets built, by tired people, in bad weather, on a ' +
      'schedule. She had walked under enough structures to know the difference between the ' +
      'drawing and the thing itself.',
  },
  {
    id: 'g6b',
    title: 'How Paper Was Made',
    grade: 6,
    blurb: 'Expository text with technical vocabulary.',
    text:
      'For centuries, paper in Europe was made from rags rather than trees. Cloth was ' +
      'collected, sorted, soaked until it began to break down, and then beaten into a pulp ' +
      'that could be lifted from a vat on a wire screen. Because the supply depended entirely ' +
      'on worn out clothing, the price of paper rose and fell with the price of cloth, and ' +
      'printers competed with one another for the collections that rag merchants brought to ' +
      'town. The shift to wood pulp in the nineteenth century made paper far cheaper and ' +
      'considerably worse. Books printed on rag paper four hundred years ago remain supple, ' +
      'while many printed a century ago are already crumbling.',
  },
  {
    id: 'g6c',
    title: 'The Salt Roads',
    grade: 6,
    blurb: 'Expository text with technical vocabulary.',
    text:
      'Salt seems ordinary now, but for most of history it was the only reliable way to keep ' +
      'meat and fish through a winter, which made it worth transporting enormous distances. ' +
      'Entire trade routes existed for nothing else. Caravans crossed the Sahara carrying ' +
      'slabs of it southward, and in some regions it was traded by weight against gold. Towns ' +
      'grew up around the crossings where the salt roads met, and several of them are still ' +
      'there, with names that mean nothing to anyone who does not know what used to pass ' +
      'through. Refrigeration destroyed the trade so completely that it is now difficult to ' +
      'imagine salt being precious at all.',
  },
  {
    id: 'g6d',
    title: 'Reading the Sky',
    grade: 6,
    blurb: 'Expository text with technical vocabulary.',
    text:
      'Long before instruments, sailors navigated by reading conditions that seem invisible to ' +
      'an untrained eye. The colour of the water changes near a reef. Certain birds never ' +
      'travel more than a fixed distance from land, so sighting one narrows your position ' +
      'considerably. A swell arriving from an unexpected direction has been bent around an ' +
      'island somewhere beyond the horizon. Navigators in the Pacific memorised these patterns ' +
      'across thousands of miles of open ocean and passed them on without writing any of it ' +
      'down. The knowledge was carried as chant and story, which is a far more durable storage ' +
      'method than it sounds, provided somebody keeps reciting it.',
  },
  {
    id: 'g6e',
    title: 'The Silk Moth',
    grade: 6,
    blurb: 'Expository text with technical vocabulary.',
    text:
      'The silk moth has been raised in captivity for so many thousands of years that it can ' +
      'no longer survive in the wild. The adults cannot fly, having lost the ability over ' +
      'generations of being kept in trays. They cannot feed. Their entire adult existence ' +
      'lasts a few days and consists of mating and laying eggs. Every part of the animal that ' +
      'did not serve the production of silk has gradually been bred away. It is one of the ' +
      'very few species that exists now only because people continue to want something from ' +
      'it, and it would vanish within a single generation if they stopped.',
  },
  {
    id: 'g7b',
    title: 'The Printing Press',
    grade: 7,
    blurb: 'Abstract argument, complex syntax.',
    text:
      'The usual account credits the printing press with spreading literacy, which is true but ' +
      'incomplete. Its stranger effect was on the fixity of texts. A book copied by hand ' +
      'accumulates errors, and every copy differs slightly from the one before it, so a ' +
      "scholar could never be certain whether a passage was the author's or a copyist's " +
      'invention. Printing did not eliminate mistakes, but it made them identical across an ' +
      'entire run. For the first time, two people in different countries could argue about the ' +
      'same sentence and be confident they were reading the same words. Much of what followed ' +
      'in science depended on that unglamorous property rather than on wider readership.',
  },
  {
    id: 'g7c',
    title: 'What Bones Remember',
    grade: 7,
    blurb: 'Abstract argument, complex syntax.',
    text:
      'A skeleton records a great deal about the life that was lived in it. Bone is not inert. ' +
      'It remodels continuously in response to load, thickening where force is repeatedly ' +
      'applied and thinning where it is not, which means an archer, a rower and a weaver each ' +
      'leave different marks. Periods of illness or hunger in childhood show up as faint ' +
      'horizontal lines in the enamel of teeth, laid down at the time and never erased. From a ' +
      'single individual, a careful examination can suggest occupation, approximate age, past ' +
      'injuries, and whether the person went hungry at seven years old. None of it was written ' +
      'down, and none of it can be edited afterwards.',
  },
  {
    id: 'g7d',
    title: 'The Quiet Engine',
    grade: 7,
    blurb: 'Abstract argument, complex syntax.',
    text:
      'Electric motors are not a recent invention. Practical versions existed in the ' +
      'nineteenth century, and for a time it was genuinely unclear whether the automobile ' +
      'would run on petrol or batteries. Early electric cars were quieter, cleaner, and far ' +
      'easier to start, since a petrol engine of that era had to be cranked by hand, which ' +
      'occasionally broke a wrist. What decided the contest was not the motor but the fuel. ' +
      'Petrol carried enormously more energy for its weight than any battery then available, ' +
      'and the discovery of large oil fields made it cheap. The engineering question was ' +
      'settled by geology rather than by engineering.',
  },
  {
    id: 'g7e',
    title: 'Naming the Elements',
    grade: 7,
    blurb: 'Abstract argument, complex syntax.',
    text:
      'The names of the chemical elements form an accidental record of who was doing the work ' +
      'and where. Some are geographical, honouring the town or country of the laboratory that ' +
      'isolated them. Several commemorate scientists. A few describe a property observed at ' +
      'the moment of discovery, such as a colour in a flame or a peculiar smell. Because the ' +
      'naming is by convention rather than rule, disputes have occasionally lasted decades, ' +
      'with rival laboratories using different names for the same substance in their own ' +
      'journals. An international committee now arbitrates, which has made the process orderly ' +
      'and has removed most of what made it interesting.',
  },
  {
    id: 'g8b',
    title: 'The Vanishing Bees',
    grade: 8,
    blurb: 'Historical exposition and abstract reasoning.',
    text:
      'When beekeepers began reporting colonies that emptied suddenly, with the workers gone ' +
      'and the queen left behind, the obvious explanation was a single new disease. Years of ' +
      'investigation suggested something less satisfying. Colonies under multiple simultaneous ' +
      'pressures, including a parasitic mite, several viruses, reduced variety in available ' +
      'forage, and exposure to certain pesticides, appear to fail in ways that no one of those ' +
      'pressures produces alone. This is a difficult finding to act upon. A single cause ' +
      'implies a single remedy, whereas an accumulation of moderate stresses implies that a ' +
      'good deal must change at once. Research funding and public attention both tend to ' +
      'favour problems that have a villain.',
  },
  {
    id: 'g8c',
    title: 'The Library at Alexandria',
    grade: 8,
    blurb: 'Historical exposition and abstract reasoning.',
    text:
      'The library at Alexandria is usually described as having been destroyed in a fire, ' +
      'which makes for a memorable story and is probably not what happened. The evidence ' +
      'suggests a long decline rather than a single catastrophe. Funding was withdrawn, ' +
      'scholars were expelled during political disputes, the papyrus deteriorated in the ' +
      'climate, and the institution that had once employed copyists to reproduce failing ' +
      'manuscripts stopped doing so. Collections do not usually vanish dramatically. They are ' +
      'far more often lost through decades of ordinary neglect, which is harder to narrate and ' +
      'considerably more instructive, since neglect is a condition that any present day ' +
      'archive can recognise in itself.',
  },
  {
    id: 'g8d',
    title: 'Measuring the Earth',
    grade: 8,
    blurb: 'Historical exposition and abstract reasoning.',
    text:
      'More than two thousand years ago a librarian in Egypt calculated the circumference of ' +
      'the earth to within a few percent, using a stick and a well. He knew that at noon on a ' +
      'particular day the sun shone directly down a well in one city, casting no shadow at ' +
      'all. On the same day in another city, some distance north, a vertical stick did cast a ' +
      'shadow. By measuring the angle of that shadow and knowing roughly the distance between ' +
      'the two cities, he could work out what fraction of a full circle separated them. The ' +
      'method requires no instruments beyond a protractor and a willingness to assume the ' +
      'earth is round.',
  },
  {
    id: 'g8e',
    title: 'The Cost of a Map',
    grade: 8,
    blurb: 'Historical exposition and abstract reasoning.',
    text:
      'Producing an accurate national survey was, for most of the eighteenth and nineteenth ' +
      'centuries, among the most expensive undertakings a government could attempt. Teams ' +
      'carried heavy theodolites up mountains and waited weeks for clear weather to sight ' +
      'between peaks. The work proceeded by triangulation, measuring one baseline with ' +
      'extraordinary care and then building outward from it, so that a small error at the ' +
      'start propagated across an entire country. Some surveys took generations to complete, ' +
      'with sons finishing sections their fathers had begun. Governments funded them anyway, ' +
      'because a state that cannot accurately describe its own territory cannot tax it, defend ' +
      'it, or build a railway across it.',
  },
  {
    id: 'g9b',
    title: 'The Placebo Problem',
    grade: 9,
    blurb: 'Complex syntax, sustained argument.',
    text:
      'A drug trial that compares a treatment against nothing at all will almost always favour ' +
      'the treatment, because a great deal of improvement follows simply from being treated. ' +
      'Patients receiving an inert substance frequently report genuine relief, and in some ' +
      'conditions the measured effect is substantial. This is why trials compare against a ' +
      'placebo rather than against no intervention. What complicates the design is that the ' +
      'effect depends partly on expectation, so a patient who suspects they have received the ' +
      'inactive version responds differently. Trials therefore go to considerable lengths to ' +
      'make the two arms indistinguishable, including matching taste and colour, and ' +
      'occasionally reproducing the side effects of the real compound.',
  },
  {
    id: 'g9c',
    title: 'The Invention of Zero',
    grade: 9,
    blurb: 'Complex syntax, sustained argument.',
    text:
      'Zero arrived late in mathematics, and its lateness is easier to understand than it ' +
      'first appears. Counting systems developed to answer questions about quantities that ' +
      'were present, and there was little reason to name the absence of a quantity. What ' +
      'forced the issue was positional notation. Once the value of a digit depends on its ' +
      'place, a symbol is needed to indicate that a particular place is empty, or the number ' +
      'three hundred and five becomes indistinguishable from thirty five. Zero entered as a ' +
      'placeholder, a piece of bookkeeping. Only later was it treated as a number in its own ' +
      'right, which required accepting that nothing could be operated upon.',
  },
  {
    id: 'g9d',
    title: 'Why Bridges Fall',
    grade: 9,
    blurb: 'Complex syntax, sustained argument.',
    text:
      'Structural failures are rarely caused by a load exceeding what the material could bear. ' +
      'Far more often the structure encounters a condition its designer never modelled. A ' +
      'suspension bridge that collapsed in a moderate wind had been calculated to withstand ' +
      'far stronger gusts, but the analysis considered only static pressure and not the ' +
      'possibility that the deck would begin oscillating in resonance with the airflow. The ' +
      'engineering was not careless. It was complete with respect to the questions being ' +
      'asked. This is the recurring shape of such disasters, and it is why post failure ' +
      'investigations spend less time on arithmetic than on reconstructing which assumptions ' +
      'everybody involved considered too obvious to write down.',
  },
  {
    id: 'g9e',
    title: 'The Language of Whales',
    grade: 9,
    blurb: 'Complex syntax, sustained argument.',
    text:
      'Humpback whales in a given ocean population sing an elaborate song that all the males ' +
      'perform, and the song changes over the course of a season. What makes it unusual is ' +
      'that the changes propagate. A variation introduced by a few individuals spreads through ' +
      'the population until nearly everyone is singing the new version, and recordings across ' +
      'successive years show a continuous drift rather than a set of fixed regional dialects. ' +
      'Occasionally an entire song from one ocean basin has been observed replacing the local ' +
      'song in another, moving eastward over several years. Whatever function the song serves, ' +
      'it is transmitted socially, and it is subject to something closely resembling fashion.',
  },
  {
    id: 'g10b',
    title: 'The Replication Crisis',
    grade: 10,
    blurb: 'Analytical prose with embedded clauses.',
    text:
      'A published finding is supposed to describe something true about the world, which ' +
      'implies that another laboratory following the same procedure should observe the same ' +
      'result. When researchers began systematically attempting this across several fields, a ' +
      'substantial fraction of well known findings did not reproduce. The causes turned out to ' +
      'be structural rather than fraudulent. Journals preferred positive results, so negative ' +
      'findings went unpublished and the literature was skewed before anyone read it. Sample ' +
      'sizes were frequently too small to detect the effects claimed. Analytical choices made ' +
      'after seeing the data could generate significance from noise. None of this required bad ' +
      'faith, only a set of incentives that rewarded novelty over verification.',
  },
  {
    id: 'g10c',
    title: 'Reading the Ice',
    grade: 10,
    blurb: 'Analytical prose with embedded clauses.',
    text:
      'An ice core drilled from a polar sheet is a sequential archive of the atmosphere. Each ' +
      'annual layer traps bubbles of air, and those bubbles preserve the composition of the ' +
      'atmosphere at the moment the snow was compressed, including the concentration of carbon ' +
      'dioxide. Ratios of oxygen isotopes in the ice itself indicate the temperature at which ' +
      'the original snow formed. Layers of ash establish dates by matching known volcanic ' +
      'eruptions. Together these allow a reconstruction extending back hundreds of thousands ' +
      'of years, and the reconstruction is testable, since independent records from ocean ' +
      'sediments and tree rings must agree with it over the intervals where they overlap.',
  },
  {
    id: 'g10d',
    title: 'The Economics of Scarcity',
    grade: 10,
    blurb: 'Analytical prose with embedded clauses.',
    text:
      'Standard economic reasoning treats scarcity as a condition that prices respond to, but ' +
      'a body of research suggests scarcity also alters the reasoning of the person ' +
      'experiencing it. Individuals operating under severe constraint, whether of money or ' +
      'time, show measurable changes in attention. They become notably better at managing the ' +
      'immediate shortage and notably worse at attending to matters outside it, including ' +
      'obligations whose neglect will prove costly later. The effect appears in both wealthy ' +
      'and poor participants when scarcity is induced experimentally, which argues against ' +
      'explanations rooted in character. The policy implication is uncomfortable, since it ' +
      'suggests that some consequences of poverty are cognitive rather than merely financial.',
  },
  {
    id: 'g10e',
    title: 'The Problem of Induction',
    grade: 10,
    blurb: 'Analytical prose with embedded clauses.',
    text:
      'Every prediction about the future rests on the assumption that patterns observed so far ' +
      'will continue, and that assumption cannot itself be established by observation without ' +
      'arguing in a circle. This was stated with uncomfortable clarity in the eighteenth ' +
      'century and has never been satisfactorily answered. The practical response has been to ' +
      'stop seeking certainty and to formalise degrees of confidence instead, which is what ' +
      'statistical inference does. A well designed study does not prove that a treatment ' +
      'works. It establishes that the observed result would be unlikely if the treatment did ' +
      'nothing, which is a weaker claim and, unlike the stronger one, is actually available to ' +
      'us.',
  },
  {
    id: 'g11b',
    title: 'The Observer Effect',
    grade: 11,
    blurb: 'Sustained reasoning, technical vocabulary.',
    text:
      'In everyday usage the observer effect refers to the difficulty of measuring a system ' +
      'without disturbing it, and the examples are usually mundane. Inserting a thermometer ' +
      'into a small volume of liquid changes its temperature slightly. Attaching a tracking ' +
      'device to an animal alters its behaviour. The principle becomes philosophically ' +
      'interesting only when the disturbance cannot be reduced arbitrarily by better ' +
      'instruments, which is the situation in quantum mechanics and is frequently confused ' +
      'with the far weaker classical version. The confusion matters because it invites the ' +
      'conclusion that consciousness plays some special role in physics, a claim the ' +
      'underlying mathematics does not support and which working physicists have spent decades ' +
      'trying to dislodge.',
  },
  {
    id: 'g11c',
    title: 'Cartography and Power',
    grade: 11,
    blurb: 'Sustained reasoning, technical vocabulary.',
    text:
      'Any projection of a sphere onto a flat surface must distort something, and the choice ' +
      'of what to distort has never been merely technical. The projection that dominated ' +
      'classrooms for centuries preserves angles, which made it invaluable for navigation, but ' +
      'it enlarges landmasses progressively toward the poles. The consequence is that regions ' +
      "near the equator, containing most of the world's population, appear substantially " +
      'smaller than their actual area, while northern territories appear enormous. Whether ' +
      'this was intended is genuinely disputed. What is not disputed is that generations ' +
      'formed their intuitions about the relative size of continents from a mathematical ' +
      'compromise selected for reasons that had nothing to do with teaching geography.',
  },
  {
    id: 'g11d',
    title: 'The Ethics of Triage',
    grade: 11,
    blurb: 'Sustained reasoning, technical vocabulary.',
    text:
      'Triage systems allocate scarce medical attention by expected benefit rather than by ' +
      'severity, which produces conclusions that feel wrong to almost everyone on first ' +
      'encounter. The most gravely injured patient may be treated last, not from indifference, ' +
      'but because the resources required to attempt a recovery of low probability would, ' +
      'applied elsewhere, save several people whose prospects are better. The reasoning is ' +
      'defensible and it is also genuinely costly to those who apply it. Clinicians who work ' +
      'under formal triage protocols report that the difficulty is not the decision itself, ' +
      'which the protocol largely makes for them, but the requirement to keep making it while ' +
      'the person in front of them remains visible.',
  },
  {
    id: 'g11e',
    title: 'What Statistics Conceal',
    grade: 11,
    blurb: 'Sustained reasoning, technical vocabulary.',
    text:
      'An average is a summary, and every summary discards information. Reporting that a ' +
      'treatment produces a modest improvement on average is consistent with several quite ' +
      'different underlying realities. It may help everyone slightly. It may help a minority ' +
      'substantially while doing nothing for the rest. It may help most people while harming a ' +
      'few. These possibilities carry entirely different implications for whether an ' +
      'individual should accept the treatment, and the average alone cannot distinguish ' +
      'between them. The distribution can, which is why the increasing convention of ' +
      'publishing full distributions alongside summary statistics represents a more ' +
      'significant methodological advance than its unremarkable appearance suggests.',
  },
  {
    id: 'g12b',
    title: 'The Paradox of Choice',
    grade: 12,
    blurb: 'Layered syntax, sophisticated abstraction.',
    text:
      'The assumption that expanding the range of options available to a person necessarily ' +
      'improves their situation is intuitive, defensible in the abstract, and contradicted by ' +
      'a good deal of evidence. Beyond a moderate number, additional alternatives appear to ' +
      'reduce both the likelihood that a choice will be made at all and the satisfaction ' +
      'reported afterwards by those who do choose. The proposed mechanism is that a larger ' +
      'field increases the vividness of what was forgone, so that every selection carries the ' +
      'accumulated weight of the alternatives rejected. The finding has been contested and ' +
      'does not replicate uniformly, but it has proved durable enough to complicate any ' +
      'straightforward equation between freedom and welfare.',
  },
  {
    id: 'g12c',
    title: 'Models and Their Discontents',
    grade: 12,
    blurb: 'Layered syntax, sophisticated abstraction.',
    text:
      'A model is a deliberate simplification, and its value derives from precisely what it ' +
      'leaves out. This creates a persistent difficulty, because the assumptions that make a ' +
      'model tractable are the same assumptions that limit where it applies, and those limits ' +
      'are rarely as visible as the outputs. A model calibrated on one period will perform ' +
      'well until conditions move outside the range it was fitted to, at which point it ' +
      'continues producing confident numbers with no indication that anything has changed. The ' +
      'discipline required is to hold two things simultaneously: that the model is the best ' +
      'available account, and that its silence about its own boundaries is not evidence of ' +
      'their absence.',
  },
  {
    id: 'g12d',
    title: 'The Archive and the Absence',
    grade: 12,
    blurb: 'Layered syntax, sophisticated abstraction.',
    text:
      'Historical archives preserve what somebody at the time considered worth preserving, and ' +
      'that judgement was never neutral. Records of property, litigation and taxation survive ' +
      'in abundance because states had reasons to keep them. The ordinary lives of people who ' +
      'owned little and sued nobody appear, when they appear at all, incidentally, in the ' +
      'margins of documents created for other purposes. A historian working from such material ' +
      'faces a difficulty that no amount of diligence resolves, since the gaps are not random ' +
      'but systematically correlated with powerlessness. Reading the absences has become a ' +
      'methodology in its own right, requiring inference from the shape of what is missing ' +
      'rather than from what remains.',
  },
  {
    id: 'g12e',
    title: 'Emergence',
    grade: 12,
    blurb: 'Layered syntax, sophisticated abstraction.',
    text:
      'Certain properties belong to systems rather than to their components, and cannot be ' +
      'located in any part taken individually. Temperature is the standard illustration. A ' +
      'single molecule has velocity but not temperature, which is a statistical description of ' +
      'an enormous population and becomes meaningless below a certain scale. The interesting ' +
      'question is whether emergence is merely an artefact of description, a convenience ' +
      'adopted because tracking every component is impractical, or whether emergent properties ' +
      'possess a genuine causal standing of their own. The distinction is not idle. It bears ' +
      'directly on whether explanations offered in biology and economics are provisional stand ' +
      'ins for physics, or accounts that physics could not in principle supply.',
  },
]

/**
 * DEMO MODE passage. Not shown in the picker.
 *
 * `public/demo/clean-read.wav` is a bundled recording of exactly this text, and demo mode
 * (Ctrl+Shift+D) runs that file through the real decode -> Whisper -> score pipeline. The
 * passage has to match the recording or the demo produces a wall of omissions, so this text
 * and that wav file are a matched pair, change one and you must re-record the other.
 *
 * It is 40 words rather than ~100 because the recording is eleven seconds long. Demo mode is
 * insurance against a dead microphone in a noisy room, not a substitute for a real assessment,
 * and the UI labels every demo result as a bundled recording so no one mistakes it for one.
 */
export const DEMO_PASSAGE = {
  id: 'demo',
  title: 'Little Fox and the Stone',
  grade: 2,
  blurb: 'Bundled demo recording.',
  isDemo: true,
  text:
    'Little Fox lived at the edge of the woods. Every morning she went down to the stream to ' +
    'drink. One day she found a shiny stone in the water. It was smooth and cold and it ' +
    'sparkled in the sun.',
}

/** Word count as the scorer will see it: whitespace-split, punctuation ignored. */
export function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length
}
