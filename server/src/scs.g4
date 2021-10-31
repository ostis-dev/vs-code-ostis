grammar scs;

options {
	language = TypeScript;
}

content: ('_')? CONTENT_BODY;

contour: CONTOUR_BEGIN (sentence_wrap*) CONTOUR_END;

connector_edge:
	symbol = (
		'<>'
		| '<=>'
		| '_<>'
		| '_<=>'
		| '>'
		| '<'
		| '=>'
		| '<='
		| '_=>'
		| '_<='
	);

connector_arc:
	symbol = (
		'..>'
		| '<..'
		| '->'
		| '<-'
		| '-|>'
		| '<|-'
		| '-/>'
		| '</-'
		| '~>'
		| '<~'
		| '~|>'
		| '<|~'
		| '~/>'
		| '</~'
		| '_..>'
		| '_<..'
		| '_->'
		| '_<-'
		| '_-|>'
		| '_<|-'
		| '_-/>'
		| '_</-'
		| '_~>'
		| '_<~'
		| '_~|>'
		| '_<|~'
		| '_~/>'
		| '_</~'
	);

connector: connector_edge | connector_arc;

// ------------- Rules --------------------

syntax: sentence_wrap* EOF;

sentence_wrap: (sentence SENTENCE_SEP);

sentence: sentence_assign | sentence_lvl_common;

ifdf_alias: ALIAS_SYMBOLS;

idtf_system: (ID_SYSTEM | '...');

sentence_assign: ALIAS_SYMBOLS '=' idtf_common;

idtf_edge:
	'(' src = idtf_atomic connector attr = attr_list? trg = idtf_atomic ')';

idtf_set_item: attr_list? idtf_common;

idtf_set_item_list: idtf_set_item (';' idtf_set_item)*;

idtf_set: '{' idtf_set_item_list '}';

idtf_atomic: ifdf_alias | idtf_system;

idtf_url: LINK;

idtf_common:
	idtf_atomic
	| idtf_edge
	| idtf_set
	| contour
	| content
	| idtf_url;

idtf_list:
	idtf_common internal_sentence_list? (
		';' idtf_common internal_sentence_list?
	)*;

internal_sentence: connector attr_list? idtf_list;

internal_sentence_list:
	'(*' (internal_sentence SENTENCE_SEP)+ '*)';

sentence_lvl_4_list_item: (connector attr_list? idtf_list);

sentence_lvl_common:
	idtf_common sentence_lvl_4_list_item (
		';' sentence_lvl_4_list_item
	)*;

attr_list: (ID_SYSTEM EDGE_ATTR)+;

// ----------------------------

ID_SYSTEM: ('a' ..'z' | 'A' ..'Z' | '_' | '.' | '0' ..'9')+;

ALIAS_SYMBOLS:
	'@' ('a' ..'z' | 'A' ..'Z' | '_' | '0' ..'9')+;

fragment CONTENT_ESCAPED: '\\' ('[' | ']' | '\\');

fragment CONTENT_SYBMOL: (CONTENT_ESCAPED | ~('[' | ']' | '\\'));

fragment CONTENT_SYBMOL_FIRST_END: (
		CONTENT_ESCAPED
		| ~('[' | ']' | '\\' | '*')
	);

CONTOUR_BEGIN: '[*';

CONTOUR_END: '*]';

CONTENT_BODY:
	'[]'
	| '[' CONTENT_SYBMOL_FIRST_END CONTENT_SYBMOL* ']';

LINK: '"' (~('"') | '\\"')* '"';

EDGE_ATTR: ':' | '::';

LINE_TERMINATOR: [\r\n\u2028\u2029] -> channel(HIDDEN);

LINE_COMMENT:
	'//' ~('\n' | '\r')* '\r'? '\n' -> channel(HIDDEN);

MULTINE_COMMENT: '/*' .*? '*/' -> channel(HIDDEN);

WS: ( ' ' | '\t' | '\r' | '\n') -> channel(HIDDEN);

SENTENCE_SEP: ';;';