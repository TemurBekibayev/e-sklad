import 'package:flutter_test/flutter_test.dart';
import 'package:ofitsiyant/core/utils/transliteration_helper.dart';

void main() {
  test('Uzbek Latin to Cyrillic Transliteration tests', () {
    expect(TransliterationHelper.toCyrillic('Osh'), equals('Ош'));
    expect(TransliterationHelper.toCyrillic('Bahor salati'), equals('Баҳор салати'));
    expect(TransliterationHelper.toCyrillic('Chuchvara'), equals('Чучвара'));
    expect(TransliterationHelper.toCyrillic('Achchiq-chuchuk'), equals('Аччиқ-чучук'));
    expect(TransliterationHelper.toCyrillic('Choyxona Oshi (Palov)'), equals('Чойхона Оши (Палов)'));
    expect(TransliterationHelper.toCyrillic('STOL - 1'), equals('СТОЛ - 1'));
    expect(TransliterationHelper.toCyrillic('Asosiy Zal'), equals('Асосий Зал'));
    expect(TransliterationHelper.toCyrillic('VIP Zal'), equals('ВИП Зал'));
    expect(TransliterationHelper.toCyrillic('Shashlik'), equals('Шашлик'));
    expect(TransliterationHelper.toCyrillic("Lag'mon"), equals('Лағмон'));
    expect(TransliterationHelper.toCyrillic("Ko'za sho'rva"), equals('Кўза шўрва'));
    expect(TransliterationHelper.toCyrillic("Go'sht"), equals('Гўшт'));
    expect(TransliterationHelper.toCyrillic("Ma'lumot"), equals('Маълумот'));
    expect(TransliterationHelper.toCyrillic("Eski shahar"), equals('Эски шаҳар'));
  });
}
