{
    // common functions
}

syntax 
    = (_ sentence_comment _)*

sentence_comment
 	= COMMENT
    / (sentence ';;')

sentence
    = sentence_lvl1 { return "sentence_lvl1"; }
	/ sentence_lvl_common { return "sentence_lvl_common"; }
    / sentence_assign

sentence_assign
    = ID_SYSTEM _ '=' _ idtf_common
    
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
	= '(' idtf_system
	      connector attr_list?
	      idtf_system
	  ')'
	
idtf_set "set"
	= '{' attr_list? idtf_common (';' attr_list? idtf_common)* '}'

idtf_common
	= idtf_system
	/ idtf_edge
	/ idtf_set
	/ CONTENT
	/ LINK

idtf_list
	= _ idtf_common _ internal_sentence_list? (_ ';' _ idtf_common _ internal_sentence_list?)*

internal_sentence "internal sentence"
	= _ connector _ attr_list? idtf_list

internal_sentence_list
	= '(*' _ (internal_sentence ';;')+ _ '*)'

sentence_lvl1
 	= idtf_lvl1 _ '|' _ idtf_lvl1 _ '|' _ idtf_lvl1

sentence_lvl_common
    = idtf_common _ connector _ attr_list? _ idtf_list (';' _ connector _ attr_list? idtf_list)*

attr_list "attributes list"
    = (ID_SYSTEM _ EDGE_ATTR)+

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
    = _ ([.]+)? ([_]?) [a-zA-Z0-9_]+ _ 
    { 
        var value = { text: text(), location: location() };
        options.parsedData._onAppendSymbol(options.docUri, value.text, value.location);
        return value;
    }

EDGE_ATTR "edge attribute modifier"
    = (
        ':' / '::'
      )

COMMENT "comments"
    = ('//' ([^\n])*) { return "comment"; }
    / ("/*" (!"*/" .)* "*/")

LINK "link to file"
    = '"' (!'"' .)* '"'

CONTENT "content"
    = '[' [^\]]* ']'

_ "whitespace"
    = [ \t\r\n]*