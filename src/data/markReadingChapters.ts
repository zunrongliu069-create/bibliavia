import type {
  LocalizedReadingText,
  ReadingChapterDefinition,
  ReadingChoiceInteraction,
  ReadingConnectInteraction,
  ReadingOrderInteraction,
} from '../types';

type SectionSeed = {
  id: string;
  title: LocalizedReadingText;
  summary: LocalizedReadingText;
  startVerse: number;
  endVerse: number;
};

const l = (
  en: string,
  sv: string,
  zhHans: string,
  zhHant: string = zhHans,
): LocalizedReadingText => ({ en, sv, 'zh-Hans': zhHans, 'zh-Hant': zhHant });

const choosePrompt = l(
  'Which summary matches the passage you just read?',
  'Vilken sammanfattning passar texten du just läste?',
  '哪一个总结符合你刚读的经文？',
  '哪一個總結符合你剛讀的經文？',
);
const orderPrompt = l(
  'Put the chapter scenes in their reading order.',
  'Sätt kapitlets scener i läsordning.',
  '按本章中的顺序排列这些场景。',
  '按本章中的順序排列這些場景。',
);
const connectPrompt = l(
  'Connect each scene with what happened.',
  'Koppla varje scen till det som hände.',
  '把每个场景与所发生的事连接起来。',
  '把每個場景與所發生的事連接起來。',
);
const orderExplanation = l(
  'This order follows the movement of the chapter from beginning to end.',
  'Denna ordning följer kapitlets rörelse från början till slut.',
  '这个顺序跟随本章从开始到结束的进程。',
  '這個順序跟隨本章從開始到結束的進程。',
);
const connectExplanation = l(
  'Each scene is connected to the event described in that part of the chapter.',
  'Varje scen är kopplad till händelsen som beskrivs i den delen av kapitlet.',
  '每个场景都与该段经文所描述的事件相连。',
  '每個場景都與該段經文所描述的事件相連。',
);

const markChapter = (
  chapter: number,
  estimatedMinutes: number,
  seeds: SectionSeed[],
): ReadingChapterDefinition => {
  const chooseFor = (seed: SectionSeed, index: number): ReadingChoiceInteraction => {
    const distractors = [seeds[(index + 1) % seeds.length]!, seeds[(index + 2) % seeds.length]!];
    const alternatives = [...distractors];
    alternatives.splice(index % 3, 0, seed);
    return {
      kind: 'choose',
      prompt: choosePrompt,
      options: alternatives.map((item) => ({ id: item.id, label: item.summary })),
      correctOptionId: seed.id,
      explanation: seed.summary,
    };
  };
  const order: ReadingOrderInteraction = {
    kind: 'order',
    prompt: orderPrompt,
    items: [...seeds.slice(1), seeds[0]!].map((seed) => ({ id: seed.id, label: seed.title })),
    correctOrder: seeds.map((seed) => seed.id),
    explanation: orderExplanation,
  };
  const connect: ReadingConnectInteraction = {
    kind: 'connect',
    prompt: connectPrompt,
    pairs: seeds.map((seed) => ({ id: seed.id, left: seed.title, right: seed.summary })),
    explanation: connectExplanation,
  };
  return {
    beatId: `mark-${chapter}`,
    revision: 1,
    estimatedMinutes,
    sections: seeds.map((seed, index) => ({
      id: seed.id,
      title: seed.title.en,
      titles: seed.title,
      passage: {
        bookId: 'mark',
        startChapter: chapter,
        startVerse: seed.startVerse,
        endChapter: chapter,
        endVerse: seed.endVerse,
      },
      interaction: chooseFor(seed, index),
    })),
    recap: [order, connect],
  };
};

const s = (
  id: string,
  startVerse: number,
  endVerse: number,
  title: LocalizedReadingText,
  summary: LocalizedReadingText,
): SectionSeed => ({ id, startVerse, endVerse, title, summary });

export const markReadingChapters: ReadingChapterDefinition[] = [
  markChapter(2, 7, [
    s(
      'mark-2-paralyzed',
      1,
      12,
      l('The paralyzed man', 'Den lame mannen', '瘫子得医治', '癱子得醫治'),
      l(
        'Jesus forgives and heals a paralyzed man lowered through the roof.',
        'Jesus förlåter och botar en lam man som sänks ner genom taket.',
        '耶稣赦免并医治了从房顶缒下来的瘫子。',
        '耶穌赦免並醫治了從房頂縋下來的癱子。',
      ),
    ),
    s(
      'mark-2-levi',
      13,
      17,
      l('Levi follows Jesus', 'Levi följer Jesus', '利未跟从耶稣', '利未跟從耶穌'),
      l(
        'Jesus calls Levi and eats with tax collectors and sinners.',
        'Jesus kallar Levi och äter med tullindrivare och syndare.',
        '耶稣呼召利未，并与税吏和罪人一同吃饭。',
        '耶穌呼召利未，並與稅吏和罪人一同吃飯。',
      ),
    ),
    s(
      'mark-2-fasting',
      18,
      22,
      l('A question about fasting', 'En fråga om fasta', '关于禁食的问题', '關於禁食的問題'),
      l(
        'Jesus answers with the bridegroom and pictures of new cloth and new wine.',
        'Jesus svarar med brudgummen och bilder av nytt tyg och nytt vin.',
        '耶稣以新郎、新布和新酒作答。',
        '耶穌以新郎、新布和新酒作答。',
      ),
    ),
    s(
      'mark-2-sabbath',
      23,
      28,
      l('Lord of the Sabbath', 'Herre över sabbaten', '安息日的主', '安息日的主'),
      l(
        'Jesus says the Sabbath was made for people and that the Son of Man is its Lord.',
        'Jesus säger att sabbaten skapades för människan och att Människosonen är dess Herre.',
        '耶稣说安息日是为人设立的，人子也是安息日的主。',
        '耶穌說安息日是為人設立的，人子也是安息日的主。',
      ),
    ),
  ]),
  markChapter(3, 8, [
    s(
      'mark-3-hand',
      1,
      6,
      l('A hand restored', 'En hand återställs', '枯干的手复原', '枯乾的手復原'),
      l(
        'Jesus heals a man’s hand on the Sabbath while opponents watch him.',
        'Jesus botar en mans hand på sabbaten medan motståndare bevakar honom.',
        '耶稣在安息日医治一个手枯干的人，反对者在旁窥探。',
        '耶穌在安息日醫治一個手枯乾的人，反對者在旁窺探。',
      ),
    ),
    s(
      'mark-3-crowds',
      7,
      12,
      l('Crowds by the sea', 'Folkmassor vid sjön', '海边的群众', '海邊的群眾'),
      l(
        'A great crowd comes to Jesus, and many seek healing.',
        'En stor folkmassa kommer till Jesus och många söker helande.',
        '大群人来到耶稣那里，许多人寻求医治。',
        '大群人來到耶穌那裡，許多人尋求醫治。',
      ),
    ),
    s(
      'mark-3-twelve',
      13,
      19,
      l('The twelve appointed', 'De tolv utses', '设立十二使徒', '設立十二使徒'),
      l(
        'Jesus appoints twelve to be with him and to preach with authority.',
        'Jesus utser tolv som ska vara med honom och predika med auktoritet.',
        '耶稣设立十二个人与他同在，并差他们传道、拥有权柄。',
        '耶穌設立十二個人與他同在，並差他們傳道、擁有權柄。',
      ),
    ),
    s(
      'mark-3-divided',
      20,
      30,
      l(
        'A kingdom cannot be divided',
        'Ett rike kan inte vara splittrat',
        '国不能自相纷争',
        '國不能自相紛爭',
      ),
      l(
        'Jesus answers the accusation that he casts out demons by an evil power.',
        'Jesus bemöter anklagelsen att han driver ut demoner med en ond makt.',
        '耶稣回应了他靠邪恶权势赶鬼的指控。',
        '耶穌回應了他靠邪惡權勢趕鬼的指控。',
      ),
    ),
    s(
      'mark-3-family',
      31,
      35,
      l('Jesus’ true family', 'Jesu sanna familj', '耶稣真正的家人', '耶穌真正的家人'),
      l(
        'Jesus calls those who do God’s will his brother, sister, and mother.',
        'Jesus kallar dem som gör Guds vilja för sin bror, syster och mor.',
        '耶稣称遵行神旨意的人为他的弟兄、姐妹和母亲。',
        '耶穌稱遵行神旨意的人為他的弟兄、姐妹和母親。',
      ),
    ),
  ]),
  markChapter(4, 8, [
    s(
      'mark-4-sower',
      1,
      20,
      l('The sower and the soils', 'Såningsmannen och jordarna', '撒种人与土壤', '撒種人與土壤'),
      l(
        'Jesus tells and explains how seed is received by four kinds of soil.',
        'Jesus berättar och förklarar hur säden tas emot av fyra slags jord.',
        '耶稣讲解种子如何落在四种不同的土壤中。',
        '耶穌講解種子如何落在四種不同的土壤中。',
      ),
    ),
    s(
      'mark-4-lamp',
      21,
      25,
      l('The lamp and the measure', 'Lampan och måttet', '灯和量器', '燈和量器'),
      l(
        'Jesus teaches that light is meant to be revealed and hearers must listen carefully.',
        'Jesus lär att ljuset ska uppenbaras och att åhörarna måste lyssna noga.',
        '耶稣教导灯要显明出来，听的人应当谨慎。',
        '耶穌教導燈要顯明出來，聽的人應當謹慎。',
      ),
    ),
    s(
      'mark-4-seeds',
      26,
      34,
      l('The growing seed', 'Säden som växer', '生长的种子', '生長的種子'),
      l(
        'God’s Kingdom is pictured as seed that grows and as a tiny mustard seed becoming great.',
        'Guds rike liknas vid säd som växer och ett litet senapskorn som blir stort.',
        '神的国好像生长的种子，也像微小却长大的芥菜种。',
        '神的國好像生長的種子，也像微小卻長大的芥菜種。',
      ),
    ),
    s(
      'mark-4-storm',
      35,
      41,
      l('Jesus calms the storm', 'Jesus stillar stormen', '耶稣平静风浪', '耶穌平靜風浪'),
      l(
        'Jesus rebukes the wind and sea, and the disciples wonder who he is.',
        'Jesus tillrättavisar vinden och sjön, och lärjungarna undrar vem han är.',
        '耶稣斥责风和海，门徒惊问他究竟是谁。',
        '耶穌斥責風和海，門徒驚問他究竟是誰。',
      ),
    ),
  ]),
  markChapter(5, 8, [
    s(
      'mark-5-legion',
      1,
      20,
      l('The man among the tombs', 'Mannen bland gravarna', '坟茔里的那人', '墳塋裡的那人'),
      l(
        'Jesus frees a tormented man, who then tells what the Lord did for him.',
        'Jesus befriar en plågad man, som sedan berättar vad Herren gjort för honom.',
        '耶稣释放了一个受折磨的人，那人随后传扬主为他所做的事。',
        '耶穌釋放了一個受折磨的人，那人隨後傳揚主為他所做的事。',
      ),
    ),
    s(
      'mark-5-jairus',
      21,
      24,
      l('Jairus asks for help', 'Jairus ber om hjälp', '睚鲁求助', '睚魯求助'),
      l(
        'Jairus begs Jesus to come and lay hands on his dying daughter.',
        'Jairus ber Jesus komma och lägga händerna på hans döende dotter.',
        '睚鲁恳求耶稣去按手在他垂死的女儿身上。',
        '睚魯懇求耶穌去按手在他垂死的女兒身上。',
      ),
    ),
    s(
      'mark-5-woman',
      25,
      34,
      l(
        'A woman reaches for Jesus',
        'En kvinna sträcker sig efter Jesus',
        '妇人摸耶稣',
        '婦人摸耶穌',
      ),
      l(
        'A suffering woman touches Jesus’ garment in faith and is healed.',
        'En lidande kvinna rör vid Jesu mantel i tro och blir botad.',
        '一位患病的妇人凭信心摸耶稣的衣裳，便得了医治。',
        '一位患病的婦人憑信心摸耶穌的衣裳，便得了醫治。',
      ),
    ),
    s(
      'mark-5-daughter',
      35,
      43,
      l('The girl rises', 'Flickan reser sig', '女孩起来', '女孩起來'),
      l(
        'Jesus tells Jairus not to fear, takes the girl’s hand, and raises her.',
        'Jesus säger åt Jairus att inte frukta, tar flickans hand och reser henne upp.',
        '耶稣叫睚鲁不要怕，拉着女孩的手使她起来。',
        '耶穌叫睚魯不要怕，拉著女孩的手使她起來。',
      ),
    ),
  ]),
  markChapter(6, 10, [
    s(
      'mark-6-nazareth',
      1,
      6,
      l('Rejected at Nazareth', 'Avvisad i Nasaret', '在拿撒勒被拒绝', '在拿撒勒被拒絕'),
      l(
        'People in Jesus’ hometown take offense, and he marvels at their unbelief.',
        'Människor i Jesu hemstad tar anstöt och han förundras över deras otro.',
        '耶稣家乡的人厌弃他，他因他们不信而诧异。',
        '耶穌家鄉的人厭棄他，他因他們不信而詫異。',
      ),
    ),
    s(
      'mark-6-sent',
      7,
      13,
      l('The twelve are sent', 'De tolv sänds ut', '差遣十二门徒', '差遣十二門徒'),
      l(
        'Jesus sends the twelve in pairs to preach, heal, and call people to repent.',
        'Jesus sänder de tolv två och två för att predika, bota och kalla till omvändelse.',
        '耶稣差遣十二门徒两个两个出去传道、医治并劝人悔改。',
        '耶穌差遣十二門徒兩個兩個出去傳道、醫治並勸人悔改。',
      ),
    ),
    s(
      'mark-6-john',
      14,
      29,
      l('The death of John', 'Johannes död', '施洗约翰之死', '施洗約翰之死'),
      l(
        'Herod’s promise leads to John the Baptist being beheaded.',
        'Herodes löfte leder till att Johannes döparen halshuggs.',
        '希律的誓言导致施洗约翰被斩首。',
        '希律的誓言導致施洗約翰被斬首。',
      ),
    ),
    s(
      'mark-6-five-thousand',
      30,
      44,
      l('Five thousand are fed', 'Fem tusen får mat', '五千人吃饱', '五千人吃飽'),
      l(
        'Jesus has compassion on the crowd and feeds them with five loaves and two fish.',
        'Jesus förbarmar sig över folket och mättar dem med fem bröd och två fiskar.',
        '耶稣怜悯众人，用五个饼和两条鱼使他们吃饱。',
        '耶穌憐憫眾人，用五個餅和兩條魚使他們吃飽。',
      ),
    ),
    s(
      'mark-6-water',
      45,
      52,
      l('Jesus walks on the sea', 'Jesus går på sjön', '耶稣在海面行走', '耶穌在海面行走'),
      l(
        'Jesus comes to the disciples across the sea, calms their fear, and enters the boat.',
        'Jesus kommer till lärjungarna över sjön, stillar deras rädsla och stiger i båten.',
        '耶稣从海面来到门徒那里，平息他们的恐惧并上了船。',
        '耶穌從海面來到門徒那裡，平息他們的恐懼並上了船。',
      ),
    ),
    s(
      'mark-6-gennesaret',
      53,
      56,
      l('Healing at Gennesaret', 'Helande i Gennesaret', '革尼撒勒的医治', '革尼撒勒的醫治'),
      l(
        'People bring the sick to Jesus, and those who touch his garment are healed.',
        'Människor för de sjuka till Jesus och de som rör vid hans mantel blir botade.',
        '人们把病人带到耶稣那里，摸他衣裳的人都得了医治。',
        '人們把病人帶到耶穌那裡，摸他衣裳的人都得了醫治。',
      ),
    ),
  ]),
  markChapter(7, 7, [
    s(
      'mark-7-traditions',
      1,
      23,
      l('What makes a person unclean', 'Vad gör en människa oren', '什么使人污秽', '什麼使人污穢'),
      l(
        'Jesus teaches that evil comes from the heart, not from food eaten with unwashed hands.',
        'Jesus lär att det onda kommer från hjärtat, inte från mat som äts med otvättade händer.',
        '耶稣教导污秽来自人心，而不是用未洗的手所吃的食物。',
        '耶穌教導污穢來自人心，而不是用未洗的手所吃的食物。',
      ),
    ),
    s(
      'mark-7-woman',
      24,
      30,
      l(
        'A mother’s persistent faith',
        'En mors uthålliga tro',
        '一位母亲坚定的信心',
        '一位母親堅定的信心',
      ),
      l(
        'A Gentile mother trusts Jesus and her daughter is freed from an unclean spirit.',
        'En icke-judisk mor litar på Jesus och hennes dotter befrias från en oren ande.',
        '一位外邦母亲信靠耶稣，她的女儿便脱离了污灵。',
        '一位外邦母親信靠耶穌，她的女兒便脫離了污靈。',
      ),
    ),
    s(
      'mark-7-deaf',
      31,
      37,
      l('The deaf man hears', 'Den döve mannen hör', '聋子听见了', '聾子聽見了'),
      l(
        'Jesus heals a man who could neither hear nor speak clearly, and the crowd is amazed.',
        'Jesus botar en man som varken kunde höra eller tala tydligt, och folket häpnar.',
        '耶稣医好一个耳聋舌结的人，众人都十分惊奇。',
        '耶穌醫好一個耳聾舌結的人，眾人都十分驚奇。',
      ),
    ),
  ]),
  markChapter(8, 8, [
    s(
      'mark-8-four-thousand',
      1,
      10,
      l('Four thousand are fed', 'Fyra tusen får mat', '四千人吃饱', '四千人吃飽'),
      l(
        'Jesus has compassion and feeds four thousand people with seven loaves.',
        'Jesus visar medkänsla och mättar fyra tusen människor med sju bröd.',
        '耶稣怜悯众人，用七个饼使四千人吃饱。',
        '耶穌憐憫眾人，用七個餅使四千人吃飽。',
      ),
    ),
    s(
      'mark-8-warning',
      11,
      21,
      l('A sign and a warning', 'Ett tecken och en varning', '神迹与警告', '神蹟與警告'),
      l(
        'Jesus refuses a demanded sign and warns the disciples about the yeast of the leaders.',
        'Jesus vägrar ge det krävda tecknet och varnar lärjungarna för ledarnas surdeg.',
        '耶稣拒绝求神迹的要求，并警告门徒提防领袖们的酵。',
        '耶穌拒絕求神蹟的要求，並警告門徒提防領袖們的酵。',
      ),
    ),
    s(
      'mark-8-blind',
      22,
      26,
      l('Sight restored in stages', 'Synen återställs stegvis', '逐渐重见光明', '逐漸重見光明'),
      l(
        'Jesus heals a blind man in Bethsaida, and his sight becomes completely clear.',
        'Jesus botar en blind man i Betsaida och hans syn blir helt klar.',
        '耶稣在伯赛大医治一个盲人，使他完全看清。',
        '耶穌在伯賽大醫治一個盲人，使他完全看清。',
      ),
    ),
    s(
      'mark-8-confession',
      27,
      30,
      l('Peter names the Christ', 'Petrus bekänner Kristus', '彼得认出基督', '彼得認出基督'),
      l(
        'Peter answers Jesus’ question by confessing that he is the Christ.',
        'Petrus svarar på Jesu fråga genom att bekänna att han är Kristus.',
        '彼得回答耶稣，承认他就是基督。',
        '彼得回答耶穌，承認他就是基督。',
      ),
    ),
    s(
      'mark-8-cross',
      31,
      38,
      l('The way of the cross', 'Korsets väg', '十字架的道路', '十字架的道路'),
      l(
        'Jesus predicts his suffering and calls his followers to deny themselves and follow him.',
        'Jesus förutsäger sitt lidande och kallar sina efterföljare att förneka sig själva och följa honom.',
        '耶稣预言自己的受难，并呼召跟随者舍己跟从他。',
        '耶穌預言自己的受難，並呼召跟隨者捨己跟從他。',
      ),
    ),
  ]),
  markChapter(9, 9, [
    s(
      'mark-9-transfiguration',
      1,
      13,
      l('Glory on the mountain', 'Härlighet på berget', '山上的荣耀', '山上的榮耀'),
      l(
        'Jesus is transfigured before three disciples, and a voice tells them to listen to him.',
        'Jesus förvandlas inför tre lärjungar och en röst säger åt dem att lyssna till honom.',
        '耶稣在三个门徒面前变了形像，有声音吩咐他们要听他。',
        '耶穌在三個門徒面前變了形像，有聲音吩咐他們要聽他。',
      ),
    ),
    s(
      'mark-9-boy',
      14,
      29,
      l('Help my unbelief', 'Hjälp min otro', '帮助我的不信', '幫助我的不信'),
      l(
        'Jesus frees a suffering boy after his father asks for help with both faith and doubt.',
        'Jesus befriar en plågad pojke efter att hans far bett om hjälp med både tro och tvivel.',
        '一位父亲在信与疑惑中求助，耶稣便释放了他受苦的儿子。',
        '一位父親在信與疑惑中求助，耶穌便釋放了他受苦的兒子。',
      ),
    ),
    s(
      'mark-9-servant',
      30,
      37,
      l('Who is greatest?', 'Vem är störst?', '谁为大？', '誰為大？'),
      l(
        'Jesus teaches that the first must become servant of all and welcomes a child.',
        'Jesus lär att den förste måste bli allas tjänare och tar emot ett barn.',
        '耶稣教导想作首先的就要服事众人，并接纳一个孩子。',
        '耶穌教導想作首先的就要服事眾人，並接納一個孩子。',
      ),
    ),
    s(
      'mark-9-faithfulness',
      38,
      50,
      l('Faithful without stumbling', 'Trofast utan att falla', '忠心而不跌倒', '忠心而不跌倒'),
      l(
        'Jesus teaches his disciples not to hinder good and to remove what causes sin.',
        'Jesus lär lärjungarna att inte hindra det goda och att ta bort det som leder till synd.',
        '耶稣教导门徒不要拦阻善行，并要除去使人犯罪的事。',
        '耶穌教導門徒不要攔阻善行，並要除去使人犯罪的事。',
      ),
    ),
  ]),
  markChapter(10, 9, [
    s(
      'mark-10-marriage',
      1,
      12,
      l('Faithfulness in marriage', 'Trohet i äktenskapet', '婚姻中的忠诚', '婚姻中的忠誠'),
      l(
        'Jesus points back to God’s intention for a faithful and lasting marriage.',
        'Jesus pekar tillbaka på Guds avsikt med ett trofast och varaktigt äktenskap.',
        '耶稣指出神对忠贞长久婚姻的心意。',
        '耶穌指出神對忠貞長久婚姻的心意。',
      ),
    ),
    s(
      'mark-10-children',
      13,
      16,
      l('Jesus welcomes children', 'Jesus välkomnar barnen', '耶稣接纳孩子', '耶穌接納孩子'),
      l(
        'Jesus receives and blesses children, saying God’s Kingdom belongs to people like them.',
        'Jesus tar emot och välsignar barnen och säger att Guds rike tillhör sådana som dem.',
        '耶稣接纳并祝福孩子，说神的国属于像他们这样的人。',
        '耶穌接納並祝福孩子，說神的國屬於像他們這樣的人。',
      ),
    ),
    s(
      'mark-10-rich',
      17,
      31,
      l('The rich man’s choice', 'Den rike mannens val', '财主的选择', '財主的選擇'),
      l(
        'A rich man turns away, and Jesus teaches about wealth, sacrifice, and God’s power.',
        'En rik man går bedrövad bort och Jesus undervisar om rikedom, uppoffring och Guds kraft.',
        '一个财主忧愁离去，耶稣便教导财富、舍弃和神的大能。',
        '一個財主憂愁離去，耶穌便教導財富、捨棄和神的大能。',
      ),
    ),
    s(
      'mark-10-journey',
      32,
      34,
      l('Toward Jerusalem', 'Mot Jerusalem', '走向耶路撒冷', '走向耶路撒冷'),
      l(
        'On the road to Jerusalem, Jesus again tells the disciples what will happen to him.',
        'På vägen mot Jerusalem berättar Jesus åter för lärjungarna vad som ska hända honom.',
        '在前往耶路撒冷的路上，耶稣再次告诉门徒自己将要遭遇的事。',
        '在前往耶路撒冷的路上，耶穌再次告訴門徒自己將要遭遇的事。',
      ),
    ),
    s(
      'mark-10-servant',
      35,
      45,
      l('Greatness through service', 'Storhet genom tjänande', '借着服事成为大', '藉著服事成為大'),
      l(
        'Jesus says true greatness means serving, just as he came to give his life for many.',
        'Jesus säger att sann storhet är att tjäna, liksom han kom för att ge sitt liv för många.',
        '耶稣说真正的伟大在于服事，正如他来为多人舍命。',
        '耶穌說真正的偉大在於服事，正如他來為多人捨命。',
      ),
    ),
    s(
      'mark-10-bartimaeus',
      46,
      52,
      l('Bartimaeus sees', 'Bartimaios får synen', '巴底买看见了', '巴底買看見了'),
      l(
        'Blind Bartimaeus calls to Jesus, receives sight through faith, and follows him.',
        'Den blinde Bartimaios ropar till Jesus, får synen genom tron och följer honom.',
        '瞎子巴底买呼求耶稣，因信得见，并跟随了他。',
        '瞎子巴底買呼求耶穌，因信得見，並跟隨了他。',
      ),
    ),
  ]),
  markChapter(11, 7, [
    s(
      'mark-11-entry',
      1,
      11,
      l(
        'The King enters Jerusalem',
        'Kungen rider in i Jerusalem',
        '君王进入耶路撒冷',
        '君王進入耶路撒冷',
      ),
      l(
        'Jesus enters Jerusalem on a colt while the crowd welcomes him with praise.',
        'Jesus rider in i Jerusalem på ett föl medan folket välkomnar honom med lovsång.',
        '耶稣骑着驴驹进入耶路撒冷，众人欢呼迎接他。',
        '耶穌騎著驢駒進入耶路撒冷，眾人歡呼迎接他。',
      ),
    ),
    s(
      'mark-11-fig-tree',
      12,
      14,
      l(
        'The fruitless fig tree',
        'Det fruktlösa fikonträdet',
        '不结果的无花果树',
        '不結果的無花果樹',
      ),
      l(
        'Jesus finds no fruit on a fig tree and speaks judgment over it.',
        'Jesus finner ingen frukt på ett fikonträd och uttalar dom över det.',
        '耶稣在无花果树上找不到果子，便宣告审判。',
        '耶穌在無花果樹上找不到果子，便宣告審判。',
      ),
    ),
    s(
      'mark-11-temple',
      15,
      19,
      l('The temple is cleared', 'Templet rensas', '洁净圣殿', '潔淨聖殿'),
      l(
        'Jesus drives commerce from the temple and calls it a house of prayer for all nations.',
        'Jesus driver ut handeln ur templet och kallar det ett bönens hus för alla folk.',
        '耶稣赶出殿中的买卖，称圣殿为万国祷告的殿。',
        '耶穌趕出殿中的買賣，稱聖殿為萬國禱告的殿。',
      ),
    ),
    s(
      'mark-11-faith',
      20,
      26,
      l('Faith and forgiveness', 'Tro och förlåtelse', '信心与饶恕', '信心與饒恕'),
      l(
        'At the withered tree, Jesus teaches his disciples to trust God, pray, and forgive.',
        'Vid det vissnade trädet lär Jesus lärjungarna att lita på Gud, be och förlåta.',
        '在枯干的树旁，耶稣教导门徒信靠神、祷告并饶恕。',
        '在枯乾的樹旁，耶穌教導門徒信靠神、禱告並饒恕。',
      ),
    ),
    s(
      'mark-11-authority',
      27,
      33,
      l(
        'Jesus’ authority questioned',
        'Jesu auktoritet ifrågasätts',
        '耶稣的权柄受质问',
        '耶穌的權柄受質問',
      ),
      l(
        'Religious leaders question Jesus, and he answers by asking about John’s baptism.',
        'Religiösa ledare ifrågasätter Jesus och han svarar med en fråga om Johannes dop.',
        '宗教领袖质问耶稣，他则反问约翰的洗礼从何而来。',
        '宗教領袖質問耶穌，他則反問約翰的洗禮從何而來。',
      ),
    ),
  ]),
  markChapter(12, 8, [
    s(
      'mark-12-tenants',
      1,
      12,
      l('The rejected son', 'Den förkastade sonen', '被弃绝的儿子', '被棄絕的兒子'),
      l(
        'In a parable, violent tenants reject the owner’s servants and kill his beloved son.',
        'I en liknelse avvisar våldsamma arrendatorer ägarens tjänare och dödar hans älskade son.',
        '在比喻中，凶恶的园户拒绝园主的仆人，并杀害他的爱子。',
        '在比喻中，兇惡的園戶拒絕園主的僕人，並殺害他的愛子。',
      ),
    ),
    s(
      'mark-12-taxes',
      13,
      17,
      l('God and Caesar', 'Gud och kejsaren', '神与凯撒', '神與凱撒'),
      l(
        'Jesus avoids a trap by teaching what belongs to Caesar and what belongs to God.',
        'Jesus undviker en fälla genom att lära vad som tillhör kejsaren och vad som tillhör Gud.',
        '耶稣避开陷阱，教导人把凯撒的归凯撒、神的归神。',
        '耶穌避開陷阱，教導人把凱撒的歸凱撒、神的歸神。',
      ),
    ),
    s(
      'mark-12-resurrection',
      18,
      27,
      l('The God of the living', 'De levandes Gud', '活人的神', '活人的神'),
      l(
        'Jesus answers a puzzle about resurrection and declares that God is God of the living.',
        'Jesus svarar på en gåta om uppståndelsen och förklarar att Gud är de levandes Gud.',
        '耶稣回答关于复活的难题，并宣告神是活人的神。',
        '耶穌回答關於復活的難題，並宣告神是活人的神。',
      ),
    ),
    s(
      'mark-12-command',
      28,
      34,
      l('The greatest commandment', 'Det största budet', '最大的诫命', '最大的誡命'),
      l(
        'Jesus joins wholehearted love for God with love for one’s neighbor.',
        'Jesus förenar helhjärtad kärlek till Gud med kärlek till nästan.',
        '耶稣把全心爱神与爱邻舍连在一起。',
        '耶穌把全心愛神與愛鄰舍連在一起。',
      ),
    ),
    s(
      'mark-12-teachers',
      35,
      40,
      l('A warning about honor', 'En varning för ärelystnad', '警戒贪图尊荣', '警戒貪圖尊榮'),
      l(
        'Jesus warns against seeking status while exploiting other people.',
        'Jesus varnar för att söka status medan man utnyttjar andra människor.',
        '耶稣警戒人不可贪图地位、侵害别人。',
        '耶穌警戒人不可貪圖地位、侵害別人。',
      ),
    ),
    s(
      'mark-12-widow',
      41,
      44,
      l('The widow’s whole gift', 'Änkans hela gåva', '寡妇献上一切', '寡婦獻上一切'),
      l(
        'Jesus honors a poor widow whose small coins represent everything she had.',
        'Jesus hedrar en fattig änka vars små mynt är allt hon hade.',
        '耶稣称赞一位穷寡妇，因为她献上的小钱是她所有的一切。',
        '耶穌稱讚一位窮寡婦，因為她獻上的小錢是她所有的一切。',
      ),
    ),
  ]),
  markChapter(13, 8, [
    s(
      'mark-13-troubles',
      1,
      13,
      l(
        'Stand firm through trouble',
        'Stå fasta genom svårigheter',
        '在患难中站立得稳',
        '在患難中站立得穩',
      ),
      l(
        'Jesus warns of deception and suffering, calling his followers to endure and witness.',
        'Jesus varnar för bedrägeri och lidande och kallar sina efterföljare att hålla ut och vittna.',
        '耶稣警告迷惑与苦难，并呼召跟随者忍耐作见证。',
        '耶穌警告迷惑與苦難，並呼召跟隨者忍耐作見證。',
      ),
    ),
    s(
      'mark-13-warning',
      14,
      23,
      l('Do not be deceived', 'Låt er inte vilseledas', '不要受迷惑', '不要受迷惑'),
      l(
        'Jesus describes severe distress and tells the disciples not to follow false deliverers.',
        'Jesus beskriver svår nöd och säger åt lärjungarna att inte följa falska räddare.',
        '耶稣描述大灾难，并吩咐门徒不要跟随假救主。',
        '耶穌描述大災難，並吩咐門徒不要跟隨假救主。',
      ),
    ),
    s(
      'mark-13-coming',
      24,
      27,
      l('The Son of Man comes', 'Människosonen kommer', '人子来临', '人子來臨'),
      l(
        'After cosmic signs, the Son of Man comes with power and gathers his chosen people.',
        'Efter kosmiska tecken kommer Människosonen med makt och samlar sina utvalda.',
        '天地显出征兆后，人子带着大能降临，聚集他的选民。',
        '天地顯出徵兆後，人子帶著大能降臨，聚集他的選民。',
      ),
    ),
    s(
      'mark-13-watch',
      28,
      37,
      l('Stay awake', 'Håll er vakna', '警醒等候', '警醒等候'),
      l(
        'Jesus says the exact time is unknown, so every follower must remain watchful.',
        'Jesus säger att den exakta tiden är okänd, därför måste varje efterföljare vara vaksam.',
        '耶稣说无人知道确切时刻，因此每个跟随者都要警醒。',
        '耶穌說無人知道確切時刻，因此每個跟隨者都要警醒。',
      ),
    ),
  ]),
  markChapter(14, 11, [
    s(
      'mark-14-anointing',
      1,
      11,
      l(
        'Love, plotting, and betrayal',
        'Kärlek, planer och förräderi',
        '爱、阴谋与背叛',
        '愛、陰謀與背叛',
      ),
      l(
        'A woman anoints Jesus while leaders plot and Judas agrees to betray him.',
        'En kvinna smörjer Jesus medan ledarna smider planer och Judas går med på att förråda honom.',
        '一位妇人膏抹耶稣，同时领袖谋害他，犹大也答应出卖他。',
        '一位婦人膏抹耶穌，同時領袖謀害他，猶大也答應出賣他。',
      ),
    ),
    s(
      'mark-14-passover',
      12,
      25,
      l('The Passover meal', 'Påskmåltiden', '逾越节晚餐', '逾越節晚餐'),
      l(
        'Jesus shares bread and the cup as signs of his body and covenant blood.',
        'Jesus delar brödet och bägaren som tecken på sin kropp och förbundets blod.',
        '耶稣分饼与杯，作为他身体和立约之血的记号。',
        '耶穌分餅與杯，作為他身體和立約之血的記號。',
      ),
    ),
    s(
      'mark-14-denial-predicted',
      26,
      31,
      l('Failure foretold', 'Misslyckandet förutsägs', '预言门徒跌倒', '預言門徒跌倒'),
      l(
        'Jesus says the disciples will scatter and Peter will deny him three times.',
        'Jesus säger att lärjungarna ska skingras och Petrus ska förneka honom tre gånger.',
        '耶稣说门徒将四散，彼得也会三次不认他。',
        '耶穌說門徒將四散，彼得也會三次不認他。',
      ),
    ),
    s(
      'mark-14-gethsemane',
      32,
      42,
      l('Prayer in Gethsemane', 'Bön i Getsemane', '客西马尼的祷告', '客西馬尼的禱告'),
      l(
        'In deep sorrow, Jesus prays to the Father and submits to his will.',
        'I djup sorg ber Jesus till Fadern och underordnar sig hans vilja.',
        '耶稣在极深的忧伤中向父祷告，并顺服他的旨意。',
        '耶穌在極深的憂傷中向父禱告，並順服他的旨意。',
      ),
    ),
    s(
      'mark-14-arrest',
      43,
      52,
      l('Jesus is arrested', 'Jesus grips', '耶稣被捕', '耶穌被捕'),
      l(
        'Judas identifies Jesus with a kiss, Jesus is seized, and his followers flee.',
        'Judas pekar ut Jesus med en kyss, Jesus grips och hans efterföljare flyr.',
        '犹大以亲吻指出耶稣，耶稣被抓，跟随者都逃走了。',
        '猶大以親吻指出耶穌，耶穌被抓，跟隨者都逃走了。',
      ),
    ),
    s(
      'mark-14-trial',
      53,
      65,
      l('Before the council', 'Inför rådet', '在公会面前', '在公會面前'),
      l(
        'False testimony fails, but Jesus’ answer leads the council to condemn and mock him.',
        'Falska vittnesmål misslyckas, men Jesu svar leder till att rådet dömer och hånar honom.',
        '假见证无法成立，但耶稣的回答使公会定罪并戏弄他。',
        '假見證無法成立，但耶穌的回答使公會定罪並戲弄他。',
      ),
    ),
    s(
      'mark-14-peter',
      66,
      72,
      l('Peter denies Jesus', 'Petrus förnekar Jesus', '彼得不认耶稣', '彼得不認耶穌'),
      l(
        'Peter denies knowing Jesus three times, remembers the warning, and weeps.',
        'Petrus förnekar tre gånger att han känner Jesus, minns varningen och gråter.',
        '彼得三次不认耶稣，想起警告后便哭了。',
        '彼得三次不認耶穌，想起警告後便哭了。',
      ),
    ),
  ]),
  markChapter(15, 9, [
    s(
      'mark-15-pilate',
      1,
      15,
      l('Jesus before Pilate', 'Jesus inför Pilatus', '耶稣在彼拉多面前', '耶穌在彼拉多面前'),
      l(
        'Pilate questions Jesus but yields to the crowd and hands him over to be crucified.',
        'Pilatus förhör Jesus men ger efter för folket och utlämnar honom till korsfästelse.',
        '彼拉多审问耶稣，却向众人让步，把他交去钉十字架。',
        '彼拉多審問耶穌，卻向眾人讓步，把他交去釘十字架。',
      ),
    ),
    s(
      'mark-15-mocked',
      16,
      20,
      l('The soldiers mock the King', 'Soldaterna hånar kungen', '士兵戏弄君王', '士兵戲弄君王'),
      l(
        'Soldiers dress Jesus as a king, strike him, and lead him away.',
        'Soldater klär Jesus som en kung, slår honom och för bort honom.',
        '士兵把耶稣装扮成君王，击打他，再把他带走。',
        '士兵把耶穌裝扮成君王，擊打他，再把他帶走。',
      ),
    ),
    s(
      'mark-15-cross',
      21,
      32,
      l('Jesus is crucified', 'Jesus korsfästs', '耶稣被钉十字架', '耶穌被釘十字架'),
      l(
        'Jesus is crucified between two others while passersby and leaders mock him.',
        'Jesus korsfästs mellan två andra medan förbipasserande och ledare hånar honom.',
        '耶稣被钉在两人中间，路人与领袖都讥诮他。',
        '耶穌被釘在兩人中間，路人與領袖都譏誚他。',
      ),
    ),
    s(
      'mark-15-death',
      33,
      41,
      l('Jesus dies', 'Jesus dör', '耶稣受死', '耶穌受死'),
      l(
        'Darkness falls, Jesus dies, the temple curtain tears, and a centurion recognizes him.',
        'Mörker faller, Jesus dör, tempelförhänget brister och en officer känner igen vem han är.',
        '黑暗降临，耶稣受死，殿里的幔子裂开，一位百夫长认出他的身份。',
        '黑暗降臨，耶穌受死，殿裡的幔子裂開，一位百夫長認出他的身分。',
      ),
    ),
    s(
      'mark-15-burial',
      42,
      47,
      l('Jesus is laid in a tomb', 'Jesus läggs i graven', '耶稣被安葬', '耶穌被安葬'),
      l(
        'Joseph courageously asks for Jesus’ body and places it in a rock-cut tomb.',
        'Josef ber modigt om Jesu kropp och lägger den i en klippgrav.',
        '约瑟勇敢地求取耶稣的身体，把他安放在石墓里。',
        '約瑟勇敢地求取耶穌的身體，把他安放在石墓裡。',
      ),
    ),
  ]),
  markChapter(16, 7, [
    s(
      'mark-16-tomb',
      1,
      8,
      l('The empty tomb', 'Den tomma graven', '空坟墓', '空墳墓'),
      l(
        'The women find the stone moved and hear that Jesus has risen and gone ahead to Galilee.',
        'Kvinnorna finner stenen bortrullad och hör att Jesus har uppstått och gått före till Galileen.',
        '妇女发现石头已经滚开，并听见耶稣已经复活、先往加利利去了。',
        '婦女發現石頭已經滾開，並聽見耶穌已經復活、先往加利利去了。',
      ),
    ),
    s(
      'mark-16-appearances',
      9,
      14,
      l(
        'The risen Jesus appears',
        'Den uppståndne Jesus visar sig',
        '复活的耶稣显现',
        '復活的耶穌顯現',
      ),
      l(
        'Jesus appears to his followers and confronts their refusal to believe the witnesses.',
        'Jesus visar sig för sina efterföljare och bemöter deras ovilja att tro vittnena.',
        '耶稣向跟随者显现，并责备他们不肯相信见证人。',
        '耶穌向跟隨者顯現，並責備他們不肯相信見證人。',
      ),
    ),
    s(
      'mark-16-commission',
      15,
      18,
      l('Sent to all creation', 'Sända till hela skapelsen', '奉差遣传给万民', '奉差遣傳給萬民'),
      l(
        'Jesus sends his followers to proclaim the good news throughout the world.',
        'Jesus sänder sina efterföljare att förkunna de goda nyheterna i hela världen.',
        '耶稣差遣跟随者往普天下传扬福音。',
        '耶穌差遣跟隨者往普天下傳揚福音。',
      ),
    ),
    s(
      'mark-16-proclamation',
      19,
      20,
      l('The message goes out', 'Budskapet går ut', '福音传开', '福音傳開'),
      l(
        'Jesus is taken up, and the disciples proclaim the message with the Lord’s help.',
        'Jesus tas upp och lärjungarna förkunnar budskapet med Herrens hjälp.',
        '耶稣升天，门徒在主的帮助下到处传扬福音。',
        '耶穌升天，門徒在主的幫助下到處傳揚福音。',
      ),
    ),
  ]),
];
