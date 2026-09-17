class TransliterationHelper {
  /// O'zbekcha lotin yozuvidagi matnni kirill alifbosiga o'girish
  static String toCyrillic(String input) {
    if (input.isEmpty) return input;

    String text = input;

    // 1. O' va G' harflarini turli xil apostroflar bilan almashtirish
    final oGQuoteRegex = RegExp(r"['`’‘ʻʼ´]");

    // O' / o'
    text = text.replaceAllMapped(
      RegExp(r"O['`’‘ʻʼ´]", caseSensitive: true),
      (_) => 'Ў',
    );
    text = text.replaceAllMapped(
      RegExp(r"o['`’‘ʻʼ´]", caseSensitive: true),
      (_) => 'ў',
    );

    // G' / g'
    text = text.replaceAllMapped(
      RegExp(r"G['`’‘ʻʼ´]", caseSensitive: true),
      (_) => 'Ғ',
    );
    text = text.replaceAllMapped(
      RegExp(r"g['`’‘ʻʼ´]", caseSensitive: true),
      (_) => 'ғ',
    );

    // 2. Qo'shaloq harflar (Digraflar)
    final Map<String, String> digraphs = {
      'SH': 'Ш',
      'Sh': 'Ш',
      'sh': 'ш',
      'CH': 'Ч',
      'Ch': 'Ч',
      'ch': 'ч',
      'YO': 'Ё',
      'Yo': 'Ё',
      'yo': 'ё',
      'YU': 'Ю',
      'Yu': 'Ю',
      'yu': 'ю',
      'YA': 'Я',
      'Ya': 'Я',
      'ya': 'я',
      'YE': 'Е',
      'Ye': 'Е',
      'ye': 'е',
      'TS': 'Ц',
      'Ts': 'Ц',
      'ts': 'ц',
    };

    digraphs.forEach((latin, cyrillic) {
      text = text.replaceAll(latin, cyrillic);
    });

    // 3. So'z boshidagi yoki unlidan keyingi E -> Э
    text = text.replaceAllMapped(
      RegExp(r'(^|[^a-zA-Zа-яА-ЯўЎғҒ])E'),
      (m) => '${m[1]}Э',
    );
    text = text.replaceAllMapped(
      RegExp(r'(^|[^a-zA-Zа-яА-ЯўЎғҒ])e'),
      (m) => '${m[1]}э',
    );

    // 4. Yagona harflar xaritasi
    final Map<String, String> singleLetters = {
      'A': 'А', 'a': 'а',
      'B': 'Б', 'b': 'б',
      'D': 'Д', 'd': 'д',
      'E': 'Е', 'e': 'е',
      'F': 'Ф', 'f': 'ф',
      'G': 'Г', 'g': 'г',
      'H': 'Ҳ', 'h': 'ҳ',
      'I': 'И', 'i': 'и',
      'J': 'Ж', 'j': 'ж',
      'K': 'К', 'k': 'к',
      'L': 'Л', 'l': 'л',
      'M': 'М', 'm': 'м',
      'N': 'Н', 'n': 'н',
      'O': 'О', 'o': 'о',
      'P': 'П', 'p': 'п',
      'Q': 'Қ', 'q': 'қ',
      'R': 'Р', 'r': 'р',
      'S': 'С', 's': 'с',
      'T': 'Т', 't': 'т',
      'U': 'У', 'u': 'у',
      'V': 'В', 'v': 'в',
      'X': 'Х', 'x': 'х',
      'Y': 'Й', 'y': 'й',
      'Z': 'З', 'z': 'з',
      'C': 'К', 'c': 'к',
    };

    final StringBuffer buffer = StringBuffer();
    for (int i = 0; i < text.length; i++) {
      final char = text[i];
      if (singleLetters.containsKey(char)) {
        buffer.write(singleLetters[char]);
      } else if (oGQuoteRegex.hasMatch(char)) {
        // So'z o'rtasidagi apostrof (tutug' belgisi: ma'lumot -> маълумот)
        buffer.write('ъ');
      } else {
        buffer.write(char);
      }
    }

    return buffer.toString();
  }

  /// Tanlangan tilga qarab matnni moslashtiruvchi universal yordamchi
  /// Agar [lang] 'oz' (kirill) bo'lsa, avtomatik kirillchaga o'giradi.
  static String adapt(String text, String lang) {
    if (lang == 'oz') {
      return toCyrillic(text);
    }
    return text;
  }
}
