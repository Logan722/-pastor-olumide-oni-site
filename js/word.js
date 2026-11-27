/* =====================================================================
   Today's Word — changes automatically every day.
   One scripture (KJV) per day, picked by the visitor's date, so everyone
   sees the same word on the same day and it moves on at midnight.
   To add more, append to the list below: [headline, verse, reference].
   ===================================================================== */
(function () {
  'use strict';
  var WORDS = [
    ['Joy is coming.', 'Weeping may endure for a night, but joy cometh in the morning.', 'Psalm 30:5'],
    ['New mercy this morning.', "It is of the LORD's mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness.", 'Lamentations 3:22-23'],
    ['You are not alone.', 'Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.', 'Isaiah 41:10'],
    ['God has a plan for you.', 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.', 'Jeremiah 29:11'],
    ['Strength for today.', 'I can do all things through Christ which strengtheneth me.', 'Philippians 4:13'],
    ['It is working for your good.', 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.', 'Romans 8:28'],
    ['Let Him lead.', 'Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.', 'Proverbs 3:5-6'],
    ['You will not lack.', 'The LORD is my shepherd; I shall not want.', 'Psalm 23:1'],
    ['Your strength is renewed.', 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.', 'Isaiah 40:31'],
    ['Be strong today.', 'Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.', 'Joshua 1:9'],
    ['Help is here.', 'God is our refuge and strength, a very present help in trouble.', 'Psalm 46:1'],
    ['Rest for your soul.', 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.', 'Matthew 11:28'],
    ['Pray, then rest in His peace.', 'Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God. And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.', 'Philippians 4:6-7'],
    ['No weapon will prosper.', 'No weapon that is formed against thee shall prosper; and every tongue that shall rise against thee in judgment thou shalt condemn.', 'Isaiah 54:17'],
    ['Covered by the Almighty.', 'He that dwelleth in the secret place of the most High shall abide under the shadow of the Almighty.', 'Psalm 91:1'],
    ['Fear has no hold on you.', 'For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.', '2 Timothy 1:7'],
    ['Your help is coming.', 'I will lift up mine eyes unto the hills, from whence cometh my help. My help cometh from the LORD, which made heaven and earth.', 'Psalm 121:1-2'],
    ['A new thing is coming.', 'Behold, I will do a new thing; now it shall spring forth; shall ye not know it? I will even make a way in the wilderness, and rivers in the desert.', 'Isaiah 43:19'],
    ['Believe as you pray.', 'Therefore I say unto you, What things soever ye desire, when ye pray, believe that ye receive them, and ye shall have them.', 'Mark 11:24'],
    ['He will bring it to pass.', 'Commit thy way unto the LORD; trust also in him; and he shall bring it to pass.', 'Psalm 37:5'],
    ['He will not fail you.', 'Be strong and of a good courage, fear not, nor be afraid of them: for the LORD thy God, he it is that doth go with thee; he will not fail thee, nor forsake thee.', 'Deuteronomy 31:6'],
    ['His peace is yours.', 'Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid.', 'John 14:27'],
    ['He delivers from them all.', 'Many are the afflictions of the righteous: but the LORD delivereth him out of them all.', 'Psalm 34:19'],
    ['Arise and shine.', 'Arise, shine; for thy light is come, and the glory of the LORD is risen upon thee.', 'Isaiah 60:1'],
    ['Whom shall I fear?', 'The LORD is my light and my salvation; whom shall I fear? the LORD is the strength of my life; of whom shall I be afraid?', 'Psalm 27:1'],
    ['The Lord will fight for you.', 'The LORD shall fight for you, and ye shall hold your peace.', 'Exodus 14:14'],
    ['Rejoice in this day.', 'This is the day which the LORD hath made; we will rejoice and be glad in it.', 'Psalm 118:24'],
    ['Your vision will surely come.', 'For the vision is yet for an appointed time, but at the end it shall speak, and not lie: though it tarry, wait for it; because it will surely come, it will not tarry.', 'Habakkuk 2:3'],
    ['Restoration is here.', 'And I will restore to you the years that the locust hath eaten, the cankerworm, and the caterpiller, and the palmerworm, my great army which I sent among you.', 'Joel 2:25'],
    ['Your tears will turn to joy.', 'They that sow in tears shall reap in joy.', 'Psalm 126:5'],
    ['He cares for you.', 'Casting all your care upon him; for he careth for you.', '1 Peter 5:7'],
    ['Count it all joy.', 'My brethren, count it all joy when ye fall into divers temptations.', 'James 1:2'],
    ['God is for you.', 'What shall we then say to these things? If God be for us, who can be against us?', 'Romans 8:31'],
    ['No good thing withheld.', 'For the LORD God is a sun and shield: the LORD will give grace and glory: no good thing will he withhold from them that walk uprightly.', 'Psalm 84:11'],
    ['Perfect peace.', 'Thou wilt keep him in perfect peace, whose mind is stayed on thee: because he trusteth in thee.', 'Isaiah 26:3'],
    ['Seek Him first.', 'But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.', 'Matthew 6:33'],
    ['Give Him the burden.', 'Cast thy burden upon the LORD, and he shall sustain thee: he shall never suffer the righteous to be moved.', 'Psalm 55:22'],
    ['The Lord is good.', 'The LORD is good, a strong hold in the day of trouble; and he knoweth them that trust in him.', 'Nahum 1:7'],
    ['He rejoices over you.', 'The LORD thy God in the midst of thee is mighty; he will save, he will rejoice over thee with joy; he will rest in his love, he will joy over thee with singing.', 'Zephaniah 3:17'],
    ['His grace is enough.', 'And he said unto me, My grace is sufficient for thee: for my strength is made perfect in weakness.', '2 Corinthians 12:9'],
    ['Remember His benefits.', 'Bless the LORD, O my soul, and forget not all his benefits: Who forgiveth all thine iniquities; who healeth all thy diseases.', 'Psalm 103:2-3'],
    ['Call, and He will answer.', 'Call unto me, and I will answer thee, and shew thee great and mighty things, which thou knowest not.', 'Jeremiah 33:3'],
    ['Through the fire, you will not burn.', 'When thou passest through the waters, I will be with thee; and through the rivers, they shall not overflow thee: when thou walkest through the fire, thou shalt not be burned; neither shall the flame kindle upon thee.', 'Isaiah 43:2'],
    ['The fire still falls.', 'Then the fire of the LORD fell, and consumed the burnt sacrifice, and the wood, and the stones, and the dust, and licked up the water that was in the trench.', '1 Kings 18:38'],
    ['Taste and see.', 'O taste and see that the LORD is good: blessed is the man that trusteth in him.', 'Psalm 34:8'],
    ['Run into the strong tower.', 'The name of the LORD is a strong tower: the righteous runneth into it, and is safe.', 'Proverbs 18:10'],
    ['Your season is coming.', 'And let us not be weary in well doing: for in due season we shall reap, if we faint not.', 'Galatians 6:9'],
    ['He heals the broken-hearted.', 'He healeth the broken in heart, and bindeth up their wounds.', 'Psalm 147:3'],
    ['By His stripes.', 'But he was wounded for our transgressions, he was bruised for our iniquities: the chastisement of our peace was upon him; and with his stripes we are healed.', 'Isaiah 53:5'],
    ['Faith sees ahead.', 'Now faith is the substance of things hoped for, the evidence of things not seen.', 'Hebrews 11:1'],
    ['Give thanks in everything.', 'In every thing give thanks: for this is the will of God in Christ Jesus concerning you.', '1 Thessalonians 5:18'],
    ['Fullness of joy.', 'Thou wilt shew me the path of life: in thy presence is fulness of joy; at thy right hand there are pleasures for evermore.', 'Psalm 16:11'],
    ['The head, not the tail.', 'And the LORD shall make thee the head, and not the tail; and thou shalt be above only, and thou shalt not be beneath.', 'Deuteronomy 28:13'],
    ['Whatever you do shall prosper.', 'And he shall be like a tree planted by the rivers of water, that bringeth forth his fruit in his season; his leaf also shall not wither; and whatsoever he doeth shall prosper.', 'Psalm 1:3'],
    ['Abound in hope.', 'Now the God of hope fill you with all joy and peace in believing, that ye may abound in hope, through the power of the Holy Ghost.', 'Romans 15:13'],
    ['More than you can ask.', 'Now unto him that is able to do exceeding abundantly above all that we ask or think, according to the power that worketh in us.', 'Ephesians 3:20'],
    ['He will perfect it.', 'The LORD will perfect that which concerneth me: thy mercy, O LORD, endureth for ever: forsake not the works of thine own hands.', 'Psalm 138:8'],
    ['When I fall, I shall arise.', 'Rejoice not against me, O mine enemy: when I fall, I shall arise; when I sit in darkness, the LORD shall be a light unto me.', 'Micah 7:8'],
    ['Be of good cheer.', 'These things I have spoken unto you, that in me ye might have peace. In the world ye shall have tribulation: but be of good cheer; I have overcome the world.', 'John 16:33'],
    ['He will never leave you.', 'For he hath said, I will never leave thee, nor forsake thee.', 'Hebrews 13:5']
  ];

  var SHARE_URL = 'https://pastorolumideoni.com/daily-word';

  function today() {
    var d = new Date();
    var n = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
    var w = WORDS[n % WORDS.length];
    return { head: w[0], verse: w[1], ref: w[2] + ' (KJV)', date: d };
  }

  function shareText(w) {
    return '"' + w.verse + '" ' + w.ref + '\n\n' + w.head + " Today's word on pastorolumideoni.com:";
  }

  function copy(text, btn) {
    function done(ok) {
      var old = btn.textContent;
      btn.textContent = ok ? 'Copied!' : 'Press Ctrl+C to copy';
      setTimeout(function () { btn.textContent = old; }, 1800);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { fallback(); });
    } else fallback();
    function fallback() {
      var t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(t); done(ok);
    }
  }

  function initCard(card) {
    var w = today();
    var q = function (sel) { return card.querySelector(sel); };
    q('[data-w=date]').textContent = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(w.date);
    q('[data-w=head]').textContent = w.head;
    q('[data-w=verse]').textContent = '"' + w.verse + '"';
    q('[data-w=ref]').textContent = w.ref;

    var text = shareText(w), full = text + ' ' + SHARE_URL;
    var menu = q('.share-menu'), btn = q('[data-w=share]');
    q('[data-s=wa]').href = 'https://wa.me/?text=' + encodeURIComponent(full);
    q('[data-s=fb]').href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(SHARE_URL);
    q('[data-s=x]').href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(SHARE_URL);
    q('[data-s=tg]').href = 'https://t.me/share/url?url=' + encodeURIComponent(SHARE_URL) + '&text=' + encodeURIComponent(text);
    var copyBtn = q('[data-s=copy]');
    copyBtn.addEventListener('click', function () { copy(full, copyBtn); });

    function toggle(open) {
      var o = open == null ? menu.hidden : open;
      menu.hidden = !o; btn.setAttribute('aria-expanded', String(o));
    }
    btn.addEventListener('click', function () {
      // Phones: use the built-in share sheet when the browser offers it
      if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
        navigator.share({ title: "Today's word", text: text, url: SHARE_URL }).catch(function (e) {
          if (e && e.name !== 'AbortError') toggle(true);
        });
        return;
      }
      toggle();
    });
    document.addEventListener('click', function (e) { if (!card.contains(e.target)) toggle(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-word-card]').forEach(initCard);
  });
  window.TodaysWord = today;
})();
