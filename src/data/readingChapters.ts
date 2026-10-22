import type {
  LocalizedReadingText,
  ReadingChapterDefinition,
  ReadingChoiceInteraction,
  ReadingConnectInteraction,
  ReadingOrderInteraction,
} from '../types';
import { markReadingChapters } from './markReadingChapters';

const text = (en: string, sv: string, zhHans: string, zhHant: string): LocalizedReadingText => ({
  en,
  sv,
  'zh-Hans': zhHans,
  'zh-Hant': zhHant,
});

const passage = (startVerse: number, endVerse: number) => ({
  bookId: 'mark' as const,
  startChapter: 1,
  startVerse,
  endChapter: 1,
  endVerse,
});

const choose = (
  prompt: LocalizedReadingText,
  options: ReadingChoiceInteraction['options'],
  correctOptionId: string,
  explanation: LocalizedReadingText,
): ReadingChoiceInteraction => ({ kind: 'choose', prompt, options, correctOptionId, explanation });

const order = (
  prompt: LocalizedReadingText,
  items: ReadingOrderInteraction['items'],
  correctOrder: string[],
  explanation: LocalizedReadingText,
): ReadingOrderInteraction => ({ kind: 'order', prompt, items, correctOrder, explanation });

const connect = (
  prompt: LocalizedReadingText,
  pairs: ReadingConnectInteraction['pairs'],
  explanation: LocalizedReadingText,
): ReadingConnectInteraction => ({ kind: 'connect', prompt, pairs, explanation });

const markOne: ReadingChapterDefinition = {
  beatId: 'mark-1',
  revision: 1,
  estimatedMinutes: 8,
  sections: [
    {
      id: 'mark-1-john',
      title: 'John prepares the way',
      titles: text(
        'John prepares the way',
        'Johannes bereder vägen',
        '约翰预备道路',
        '約翰預備道路',
      ),
      passage: passage(1, 8),
      interaction: choose(
        text(
          'What did John say the one coming after him would do?',
          'Vad sade Johannes att den som kom efter honom skulle göra?',
          '约翰说，那位在他以后来的要做什么？',
          '約翰說，那位在他以後來的要做什麼？',
        ),
        [
          {
            id: 'rule',
            label: text('Rule Judea', 'Härska över Judeen', '统治犹太地', '統治猶太地'),
          },
          {
            id: 'spirit',
            label: text(
              'Baptize with the Holy Spirit',
              'Döpa med den helige Ande',
              '用圣灵施洗',
              '用聖靈施洗',
            ),
          },
          {
            id: 'temple',
            label: text('Build a temple', 'Bygga ett tempel', '建造圣殿', '建造聖殿'),
          },
        ],
        'spirit',
        text(
          'John said that he baptized with water, but the one after him would baptize with the Holy Spirit.',
          'Johannes sade att han döpte med vatten, men att den som kom efter honom skulle döpa med den helige Ande.',
          '约翰说自己用水施洗，但那位在他以后来的要用圣灵施洗。',
          '約翰說自己用水施洗，但那位在他以後來的要用聖靈施洗。',
        ),
      ),
    },
    {
      id: 'mark-1-baptism',
      title: 'Jesus is baptized and tested',
      titles: text(
        'Jesus is baptized and tested',
        'Jesus döps och prövas',
        '耶稣受洗并受试探',
        '耶穌受洗並受試探',
      ),
      passage: passage(9, 13),
      interaction: order(
        text(
          'Put these events in order.',
          'Sätt händelserna i rätt ordning.',
          '按正确顺序排列这些事件。',
          '按正確順序排列這些事件。',
        ),
        [
          {
            id: 'wilderness',
            label: text(
              'Jesus goes into the wilderness',
              'Jesus går ut i öknen',
              '耶稣进入旷野',
              '耶穌進入曠野',
            ),
          },
          {
            id: 'baptized',
            label: text('Jesus is baptized', 'Jesus döps', '耶稣受洗', '耶穌受洗'),
          },
          {
            id: 'voice',
            label: text(
              'The Spirit descends and a voice speaks',
              'Anden sänker sig och en röst talar',
              '圣灵降下，有声音说话',
              '聖靈降下，有聲音說話',
            ),
          },
        ],
        ['baptized', 'voice', 'wilderness'],
        text(
          'Jesus was baptized, the Spirit descended and the voice spoke, and then the Spirit sent him into the wilderness.',
          'Jesus döptes, Anden sänkte sig och rösten talade, och sedan drev Anden honom ut i öknen.',
          '耶稣受洗后，圣灵降下并有声音说话，随后圣灵催他进入旷野。',
          '耶穌受洗後，聖靈降下並有聲音說話，隨後聖靈催他進入曠野。',
        ),
      ),
    },
    {
      id: 'mark-1-disciples',
      title: 'Jesus calls the first disciples',
      titles: text(
        'Jesus calls the first disciples',
        'Jesus kallar de första lärjungarna',
        '耶稣呼召第一批门徒',
        '耶穌呼召第一批門徒',
      ),
      passage: passage(14, 20),
      interaction: choose(
        text(
          'How did Simon and Andrew respond when Jesus called them?',
          'Hur svarade Simon och Andreas när Jesus kallade dem?',
          '耶稣呼召西门和安得烈时，他们怎样回应？',
          '耶穌呼召西門和安得烈時，他們怎樣回應？',
        ),
        [
          {
            id: 'follow',
            label: text(
              'They left their nets and followed him',
              'De lämnade näten och följde honom',
              '他们舍了网，跟从他',
              '他們捨了網，跟從他',
            ),
          },
          {
            id: 'wait',
            label: text(
              'They asked him to return later',
              'De bad honom återkomma senare',
              '他们请他以后再来',
              '他們請他以後再來',
            ),
          },
          { id: 'home', label: text('They went home', 'De gick hem', '他们回家了', '他們回家了') },
        ],
        'follow',
        text(
          'They immediately left their nets and followed Jesus.',
          'De lämnade genast sina nät och följde Jesus.',
          '他们立刻舍了网，跟从耶稣。',
          '他們立刻捨了網，跟從耶穌。',
        ),
      ),
    },
    {
      id: 'mark-1-capernaum',
      title: 'Authority in Capernaum',
      titles: text(
        'Authority in Capernaum',
        'Auktoritet i Kafarnaum',
        '在迦百农显出权柄',
        '在迦百農顯出權柄',
      ),
      passage: passage(21, 34),
      interaction: connect(
        text(
          'Connect each place with what happened there.',
          'Koppla varje plats till det som hände där.',
          '把每个地点与在那里发生的事连接起来。',
          '把每個地點與在那裡發生的事連接起來。',
        ),
        [
          {
            id: 'synagogue',
            left: text('The synagogue', 'Synagogan', '会堂', '會堂'),
            right: text(
              'Jesus taught and an unclean spirit came out',
              'Jesus undervisade och en oren ande kom ut',
              '耶稣教训人，污鬼从人身上出来',
              '耶穌教訓人，污鬼從人身上出來',
            ),
          },
          {
            id: 'house',
            left: text(
              "Simon and Andrew's house",
              'Simon och Andreas hus',
              '西门和安得烈的家',
              '西門和安得烈的家',
            ),
            right: text(
              "Simon's mother-in-law was raised from her fever",
              'Simons svärmor blev fri från febern',
              '西门的岳母从热病中起来',
              '西門的岳母從熱病中起來',
            ),
          },
          {
            id: 'door',
            left: text('The door', 'Dörren', '门前', '門前'),
            right: text(
              'The city gathered with the sick',
              'Staden samlades med de sjuka',
              '合城的人带着病人聚集',
              '合城的人帶著病人聚集',
            ),
          },
        ],
        text(
          'Mark connects the synagogue, the house, and the door with these events in that order.',
          'Markus knyter synagogan, huset och dörren till dessa händelser i den ordningen.',
          '马可依次把会堂、家和门前与这些事件联系起来。',
          '馬可依次把會堂、家和門前與這些事件聯繫起來。',
        ),
      ),
    },
    {
      id: 'mark-1-prayer',
      title: 'Prayer and preaching through Galilee',
      titles: text(
        'Prayer and preaching through Galilee',
        'Bön och förkunnelse i Galileen',
        '在加利利祷告和传道',
        '在加利利禱告和傳道',
      ),
      passage: passage(35, 39),
      interaction: choose(
        text(
          'Why did Jesus say they should go to the nearby towns?',
          'Varför sade Jesus att de skulle gå till de närliggande byarna?',
          '耶稣为什么说他们应当往邻近的乡村去？',
          '耶穌為什麼說他們應當往鄰近的鄉村去？',
        ),
        [
          { id: 'rest', label: text('To rest', 'För att vila', '为了休息', '為了休息') },
          {
            id: 'preach',
            label: text(
              'So he could preach there also',
              'För att han skulle predika där också',
              '好在那里也传道',
              '好在那裡也傳道',
            ),
          },
          {
            id: 'hide',
            label: text(
              'To hide from everyone',
              'För att gömma sig för alla',
              '为了躲避众人',
              '為了躲避眾人',
            ),
          },
        ],
        'preach',
        text(
          'Jesus said they should go elsewhere so that he could preach there also.',
          'Jesus sade att de skulle gå vidare så att han kunde predika där också.',
          '耶稣说要往别处去，好在那里也传道。',
          '耶穌說要往別處去，好在那裡也傳道。',
        ),
      ),
    },
    {
      id: 'mark-1-clean',
      title: 'A man is made clean',
      titles: text('A man is made clean', 'En man blir ren', '一个人得洁净', '一個人得潔淨'),
      passage: passage(40, 45),
      interaction: order(
        text(
          'Put the events in order.',
          'Sätt händelserna i rätt ordning.',
          '按正确顺序排列这些事件。',
          '按正確順序排列這些事件。',
        ),
        [
          {
            id: 'spread',
            label: text(
              'The man spreads the news',
              'Mannen sprider nyheten',
              '那人把事情传扬开',
              '那人把事情傳揚開',
            ),
          },
          {
            id: 'asks',
            label: text(
              'The man asks to be made clean',
              'Mannen ber att bli ren',
              '那人求耶稣使他洁净',
              '那人求耶穌使他潔淨',
            ),
          },
          {
            id: 'priest',
            label: text(
              'Jesus sends him to the priest',
              'Jesus sänder honom till prästen',
              '耶稣叫他去给祭司察看',
              '耶穌叫他去給祭司察看',
            ),
          },
          {
            id: 'cleaned',
            label: text(
              'Jesus touches and cleanses him',
              'Jesus rör vid och renar honom',
              '耶稣摸他，使他洁净',
              '耶穌摸他，使他潔淨',
            ),
          },
        ],
        ['asks', 'cleaned', 'priest', 'spread'],
        text(
          'The man asked, Jesus touched and cleansed him, Jesus sent him to the priest, and the man then spread the news.',
          'Mannen bad, Jesus rörde vid och renade honom, Jesus sände honom till prästen och mannen spred sedan nyheten.',
          '那人祈求，耶稣摸他使他洁净，又叫他去见祭司；随后那人把事情传扬开。',
          '那人祈求，耶穌摸他使他潔淨，又叫他去見祭司；隨後那人把事情傳揚開。',
        ),
      ),
    },
  ],
  recap: [
    order(
      text(
        'Remember the broad journey of Mark 1.',
        'Minns den stora rörelsen i Markus 1.',
        '回想马可福音第一章的主要进程。',
        '回想馬可福音第一章的主要進程。',
      ),
      [
        {
          id: 'heals',
          label: text(
            'Jesus teaches and heals',
            'Jesus undervisar och botar',
            '耶稣教训人并医治人',
            '耶穌教訓人並醫治人',
          ),
        },
        {
          id: 'john',
          label: text(
            'John prepares the way',
            'Johannes bereder vägen',
            '约翰预备道路',
            '約翰預備道路',
          ),
        },
        {
          id: 'calls',
          label: text(
            'Jesus calls disciples',
            'Jesus kallar lärjungar',
            '耶稣呼召门徒',
            '耶穌呼召門徒',
          ),
        },
        {
          id: 'tested',
          label: text(
            'Jesus is baptized and tested',
            'Jesus döps och prövas',
            '耶稣受洗并受试探',
            '耶穌受洗並受試探',
          ),
        },
      ],
      ['john', 'tested', 'calls', 'heals'],
      text(
        'Mark begins with preparation, then baptism and testing, the call of disciples, and Jesus teaching and healing.',
        'Markus börjar med förberedelse, sedan dop och prövning, lärjungarnas kallelse och Jesu undervisning och helande.',
        '马可先记预备道路，然后是受洗和试探、呼召门徒，以及耶稣教训和医治。',
        '馬可先記預備道路，然後是受洗和試探、呼召門徒，以及耶穌教訓和醫治。',
      ),
    ),
    connect(
      text(
        'Connect each person or group with their response.',
        'Koppla varje person eller grupp till deras gensvar.',
        '把每个人或群体与他们的回应连接起来。',
        '把每個人或群體與他們的回應連接起來。',
      ),
      [
        {
          id: 'john',
          left: text('John', 'Johannes', '约翰', '約翰'),
          right: text('Prepares the way', 'Bereder vägen', '预备道路', '預備道路'),
        },
        {
          id: 'disciples',
          left: text('The first disciples', 'De första lärjungarna', '第一批门徒', '第一批門徒'),
          right: text(
            'Leave their work and follow',
            'Lämnar sitt arbete och följer',
            '舍下工作来跟从',
            '捨下工作來跟從',
          ),
        },
        {
          id: 'people',
          left: text(
            'People from everywhere',
            'Människor från alla håll',
            '从各处来的人',
            '從各處來的人',
          ),
          right: text('Come to Jesus', 'Kommer till Jesus', '来到耶稣那里', '來到耶穌那裡'),
        },
      ],
      text(
        'These three relationships appear across the beginning, middle, and end of the chapter.',
        'Dessa tre samband syns i kapitlets början, mitt och slut.',
        '这三组关系分别出现在本章的开头、中间和结尾。',
        '這三組關係分別出現在本章的開頭、中間和結尾。',
      ),
    ),
    choose(
      text(
        'Which statement best describes the movement of Mark 1?',
        'Vilket påstående beskriver bäst rörelsen i Markus 1?',
        '哪句话最能概括马可福音第一章的进程？',
        '哪句話最能概括馬可福音第一章的進程？',
      ),
      [
        {
          id: 'authority',
          label: text(
            "Jesus announces God's Kingdom, calls followers, and acts with authority and compassion",
            'Jesus förkunnar Guds rike, kallar efterföljare och handlar med auktoritet och medkänsla',
            '耶稣宣讲神的国、呼召跟随者，并以权柄和怜悯行事',
            '耶穌宣講神的國、呼召跟隨者，並以權柄和憐憫行事',
          ),
        },
        {
          id: 'travel',
          label: text(
            'Jesus stays alone in one place',
            'Jesus stannar ensam på en plats',
            '耶稣独自留在一个地方',
            '耶穌獨自留在一個地方',
          ),
        },
        {
          id: 'crowd',
          label: text(
            'The crowds stop looking for Jesus',
            'Folkmassorna slutar söka Jesus',
            '众人不再寻找耶稣',
            '眾人不再尋找耶穌',
          ),
        },
      ],
      'authority',
      text(
        'The chapter shows Jesus preaching the Kingdom, calling disciples, teaching, healing, and responding with compassion.',
        'Kapitlet visar Jesus förkunna riket, kalla lärjungar, undervisa, bota och handla med medkänsla.',
        '本章记载耶稣传讲神的国、呼召门徒、教训、医治并动了慈心。',
        '本章記載耶穌傳講神的國、呼召門徒、教訓、醫治並動了慈心。',
      ),
    ),
  ],
};

const chapters = new Map<string, ReadingChapterDefinition>(
  [markOne, ...markReadingChapters].map((chapter) => [chapter.beatId, chapter]),
);

export const readingChapterForBeat = (beatId: string): ReadingChapterDefinition | undefined =>
  chapters.get(beatId);
