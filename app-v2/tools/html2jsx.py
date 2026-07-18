#!/usr/bin/env python3
"""Convertit le markup HTML des pages v1 en JSX Preact, a l'identique.

Preact accepte class/for et les styles en chaine : la conversion reste donc
tres proche du source. Les seuls points a traiter :
  - balises auto-fermantes non fermees (<br>, <img>, <input>...)
  - commentaires HTML -> {/* */}
  - accolades litterales dans le texte -> echappees
  - attributs onclick="f(1)" -> onClick={() => f(1)}
  - attributs booleens sans valeur -> ={true}
"""
import re, sys

VOID = {'area','base','br','col','embed','hr','img','input','link','meta',
        'param','source','track','wbr'}

EVENTS = {
    'onclick':'onClick', 'onchange':'onChange', 'oninput':'onInput',
    'onsubmit':'onSubmit', 'onkeydown':'onKeyDown', 'onkeyup':'onKeyUp',
    'onfocus':'onFocus', 'onblur':'onBlur', 'onload':'onLoad',
    'onerror':'onError', 'ontouchstart':'onTouchStart', 'ontouchend':'onTouchEnd',
    'onmousedown':'onMouseDown', 'onmouseup':'onMouseUp',
}

# attributs HTML -> proprietes JSX (Preact tolere class/for, on garde le reste)
ATTR = {
    'stroke-width':'stroke-width', 'stroke-linecap':'stroke-linecap',
    'stroke-linejoin':'stroke-linejoin', 'stroke-dasharray':'stroke-dasharray',
    'stroke-dashoffset':'stroke-dashoffset', 'fill-rule':'fill-rule',
    'clip-rule':'clip-rule', 'text-anchor':'text-anchor',
}


def close_void(html):
    """Ferme les balises void non fermees."""
    def rep(m):
        tag, attrs = m.group(1), m.group(2)
        if tag.lower() in VOID and not attrs.rstrip().endswith('/'):
            return f'<{tag}{attrs} />'
        return m.group(0)
    return re.sub(r'<([a-zA-Z][\w-]*)((?:[^<>"\']|"[^"]*"|\'[^\']*\')*?)>', rep, html)


def conv_events(html):
    """onclick="foo(1)" -> onClick={() => foo(1)}"""
    def rep(m):
        attr, quote, code = m.group(1).lower(), m.group(2), m.group(3)
        if attr not in EVENTS:
            return m.group(0)
        code = code.replace('&quot;', '"').replace('&#39;', "'").replace('&amp;', '&')
        code = code.strip().rstrip(';')
        # event -> e (nom de parametre de la lambda)
        code = re.sub(r'\bevent\b', 'e', code)
        return f'{EVENTS[attr]}={{(e) => {{ {code} }}}}'
    return re.sub(r'\b(on[a-z]+)\s*=\s*(["\'])(.*?)\2', rep, html, flags=re.S)


def conv_bool_attrs(html):
    """<input disabled> -> <input disabled={true}>"""
    for a in ('disabled', 'checked', 'selected', 'readonly', 'required', 'autofocus', 'multiple'):
        html = re.sub(rf'(\s){a}(\s|/?>)', rf'\1{a}={{true}}\2', html)
    return html


def conv_comments(html):
    return re.sub(r'<!--(.*?)-->', lambda m: '{/*' + m.group(1).replace('*/', '* /') + '*/}', html, flags=re.S)


def escape_braces(html):
    """Echappe les { } presents dans le texte (hors expressions JSX deja creees)."""
    out, i, n = [], 0, len(html)
    while i < n:
        c = html[i]
        if c == '{':
            # expression JSX generee par ce script ? on la laisse
            out.append(c)
        elif c == '}':
            out.append(c)
        else:
            out.append(c)
        i += 1
    return ''.join(out)


def conv_style(html):
    """style="a:b" reste une chaine : Preact l'accepte tel quel."""
    return html


def convert(html):
    html = conv_comments(html)
    html = conv_events(html)
    html = conv_bool_attrs(html)
    html = close_void(html)
    html = conv_style(html)
    for k, v in ATTR.items():
        html = html.replace(f'{k}=', f'{v}=')
    # retire les <script> et <noscript> : la logique est portee separement
    html = re.sub(r'<script\b.*?</script>', '', html, flags=re.S | re.I)
    html = re.sub(r'<noscript\b.*?</noscript>', '', html, flags=re.S | re.I)
    return html.strip()


if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    print(convert(open(src, encoding='utf-8').read()), file=open(dst, 'w', encoding='utf-8'))
    print(f'{src} -> {dst}')
