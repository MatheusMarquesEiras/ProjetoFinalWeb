import spacy
from collections import Counter

def generate_title(texto, max_palavras=6):
    nlp = spacy.load('pt_core_news_sm')
    doc = nlp(texto)

    palavras_chave = [token.text for token in doc if token.pos_ in ['NOUN', 'ADJ']]

    frequencia = Counter(palavras_chave)

    palavras_mais_frequentes = [palavra for palavra, _ in frequencia.most_common(max_palavras)]

    titulo = " ".join(palavras_mais_frequentes)

    return titulo.title()

texto_exemplo = """
Usuário: Oi, tudo bem? Estou pensando em comprar um novo celular, mas estou indeciso entre o iPhone e um Android.
Assistente: Entendo! Que aspectos são mais importantes para você, como câmera, desempenho, ou preço?
Usuário: Acho que câmera e desempenho são os mais importantes. O preço é algo secundário.
Assistente: Nesse caso, o iPhone é conhecido por câmeras consistentes, mas há Androids de ponta com câmeras excelentes também.
"""
titulo = generate_title(texto_exemplo)
print("Título sugerido:", titulo)
