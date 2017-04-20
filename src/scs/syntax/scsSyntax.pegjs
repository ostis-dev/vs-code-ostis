{
    // common functions
}

syntax 
    = (_ sentence_wrap _)*

sentence_wrap
 	= (sentence ';;')

sentence
    = sentence_lvl1 { return "sentence_lvl1"; }
	/ sentence_lvl_common { return "sentence_lvl_common"; }
    / sentence_assign

sentence_assign
    = _ ID_SYSTEM _ '=' _ idtf_common
    
idtf_lvl1_preffix
	= 'sc_node'
    / 'sc_link'
    / 'sc_edge_dcommon'
    / 'sc_edge_ucommon'
    / 'sc_edge_main'
    / 'sc_edge_access'
    
idtf_lvl1_value
 	= (idtf_lvl1_preffix '#')? idtf_system
    
idtf_lvl1
	= idtf_lvl1_value
    / LINK

idtf_system
	= ID_SYSTEM
    / '...'

idtf_edge "edge"
	= '(' _ idtf_system _
	      _ connector attr_list? _
	      _ idtf_system _
	  ')'
	
idtf_set "set"
	= '{' _ attr_list? _ idtf_common (';' _ attr_list? _ idtf_common)* _ '}'

idtf_common
	= idtf_system
	/ idtf_edge
	/ idtf_set
	/ CONTENT
	/ LINK

idtf_list
	= _ idtf_common _ internal_sentence_list? (_ ';' _ idtf_common _ internal_sentence_list?)*

internal_sentence "internal sentence"
	= _ connector _ attr_list? _ idtf_list _

internal_sentence_list
	= _ '(*' _ (internal_sentence ';;')+ _ '*)' _

sentence_lvl1
 	= idtf_lvl1 _ '|' _ idtf_lvl1 _ '|' _ idtf_lvl1

sentence_lvl_common
    = _ idtf_common _ connector _ attr_list? _ idtf_list _ (';' _ connector _ attr_list? idtf_list)*

attr_list "attributes list"
    = (_ ID_SYSTEM _ EDGE_ATTR _)+

connector "connector"
    = ('<>' /
      '..>' / '<..' /
      '<=>' / '=>' / '<=' /
      '->' / '<-' / 
      '-|>' / '<|-' /
      '-/>' / '</-' /
      '~>'  / '<~'  /
      '~|>' / '<|~' /
      '~/>' / '</~' /
       '_<>' /
      '_..>'/ '_<..'/
      '_<=>'/ '_=>' / '_<=' /
      '_->' / '_<-' /
      '_-|>'/ '_<|-'/
      '_-/>'/ '_</-'/
      '_~>' / '_<~' /
      '_~|>'/ '_<|~'/
      '_~/>'/ '_</~'/
       '>' / '<' /
       '_>' / '_<'  )

// ------------------------------------------------
ID_SYSTEM "system identifier"
    = ([.]+)? ([_]?) [a-zA-Z0-9_]+
    { 
        var value = { text: text(), location: location() };
        options.parsedData._onAppendSymbol(options.docUri, value.text, value.location);
        return value;
    }

EDGE_ATTR "edge attribute modifier"
    = (
        ':' / '::'
      )

LINK "link to file"
    = '"' (!'"' .)* '"'

CONTENT "content"
    = '[' [^\]]* ']'

// COMMENT "comments"
//     = ('//' ([^\n])*) { return "comment"; }
//     / ("/*" (!"*/" .)* "*/")

// whiteSpace
//     = [ \t\r\n]*

_
    = ( whiteSpace / lineTerminator / enclosedComment / lineComment )*


whiteSpace
    = [\t\v\f \u00A0\uFEFF]

lineTerminator
    = [\n\r]

enclosedComment
    = "/*" (!"*/" anyCharacter)* "*/"

lineComment
    = "//" (!lineTerminator anyCharacter)*

anyCharacter
    = . 

