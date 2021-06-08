let SessionLoad = 1
let s:so_save = &so | let s:siso_save = &siso | set so=0 siso=0
let v:this_session=expand("<sfile>:p")
silent only
cd ~/laas_remote/laas
if expand('%') == '' && !&modified && line('$') <= 1 && getline(1) == ''
  let s:wipebuf = bufnr('%')
endif
set shortmess=aoO
badd +1068 src/api/models.py
badd +256 src/resource_inventory/models.py
argglobal
%argdel
edit src/api/models.py
set splitbelow splitright
wincmd _ | wincmd |
vsplit
1wincmd h
wincmd w
wincmd _ | wincmd |
split
1wincmd k
wincmd _ | wincmd |
vsplit
1wincmd h
wincmd w
wincmd w
wincmd _ | wincmd |
vsplit
1wincmd h
wincmd w
wincmd t
set winminheight=0
set winheight=1
set winminwidth=0
set winwidth=1
exe 'vert 1resize ' . ((&columns * 159 + 240) / 480)
exe '2resize ' . ((&lines * 61 + 62) / 125)
exe 'vert 2resize ' . ((&columns * 159 + 240) / 480)
exe '3resize ' . ((&lines * 61 + 62) / 125)
exe 'vert 3resize ' . ((&columns * 160 + 240) / 480)
exe '4resize ' . ((&lines * 61 + 62) / 125)
exe 'vert 4resize ' . ((&columns * 159 + 240) / 480)
exe '5resize ' . ((&lines * 61 + 62) / 125)
exe 'vert 5resize ' . ((&columns * 160 + 240) / 480)
argglobal
setlocal fdm=manual
setlocal fde=0
setlocal fmr={{{,}}}
setlocal fdi=#
setlocal fdl=0
setlocal fml=1
setlocal fdn=20
setlocal fen
silent! normal! zE
let s:l = 389 - ((78 * winheight(0) + 61) / 123)
if s:l < 1 | let s:l = 1 | endif
exe s:l
normal! zt
389
normal! 044|
wincmd w
argglobal
if bufexists("src/api/models.py") | buffer src/api/models.py | else | edit src/api/models.py | endif
setlocal fdm=manual
setlocal fde=0
setlocal fmr={{{,}}}
setlocal fdi=#
setlocal fdl=0
setlocal fml=1
setlocal fdn=20
setlocal fen
silent! normal! zE
let s:l = 694 - ((52 * winheight(0) + 30) / 61)
if s:l < 1 | let s:l = 1 | endif
exe s:l
normal! zt
694
normal! 0
wincmd w
argglobal
if bufexists("src/api/models.py") | buffer src/api/models.py | else | edit src/api/models.py | endif
setlocal fdm=manual
setlocal fde=0
setlocal fmr={{{,}}}
setlocal fdi=#
setlocal fdl=0
setlocal fml=1
setlocal fdn=20
setlocal fen
silent! normal! zE
let s:l = 881 - ((51 * winheight(0) + 30) / 61)
if s:l < 1 | let s:l = 1 | endif
exe s:l
normal! zt
881
normal! 020|
wincmd w
argglobal
if bufexists("src/resource_inventory/models.py") | buffer src/resource_inventory/models.py | else | edit src/resource_inventory/models.py | endif
setlocal fdm=manual
setlocal fde=0
setlocal fmr={{{,}}}
setlocal fdi=#
setlocal fdl=0
setlocal fml=1
setlocal fdn=20
setlocal fen
silent! normal! zE
let s:l = 240 - ((5 * winheight(0) + 30) / 61)
if s:l < 1 | let s:l = 1 | endif
exe s:l
normal! zt
240
normal! 0
wincmd w
argglobal
if bufexists("src/resource_inventory/models.py") | buffer src/resource_inventory/models.py | else | edit src/resource_inventory/models.py | endif
setlocal fdm=manual
setlocal fde=0
setlocal fmr={{{,}}}
setlocal fdi=#
setlocal fdl=0
setlocal fml=1
setlocal fdn=20
setlocal fen
silent! normal! zE
let s:l = 255 - ((20 * winheight(0) + 30) / 61)
if s:l < 1 | let s:l = 1 | endif
exe s:l
normal! zt
255
normal! 049|
wincmd w
exe 'vert 1resize ' . ((&columns * 159 + 240) / 480)
exe '2resize ' . ((&lines * 61 + 62) / 125)
exe 'vert 2resize ' . ((&columns * 159 + 240) / 480)
exe '3resize ' . ((&lines * 61 + 62) / 125)
exe 'vert 3resize ' . ((&columns * 160 + 240) / 480)
exe '4resize ' . ((&lines * 61 + 62) / 125)
exe 'vert 4resize ' . ((&columns * 159 + 240) / 480)
exe '5resize ' . ((&lines * 61 + 62) / 125)
exe 'vert 5resize ' . ((&columns * 160 + 240) / 480)
tabnext 1
if exists('s:wipebuf') && getbufvar(s:wipebuf, '&buftype') isnot# 'terminal'
  silent exe 'bwipe ' . s:wipebuf
endif
unlet! s:wipebuf
set winheight=1 winwidth=20 winminheight=1 winminwidth=1 shortmess=filnxtToOFc
let s:sx = expand("<sfile>:p:r")."x.vim"
if file_readable(s:sx)
  exe "source " . fnameescape(s:sx)
endif
let &so = s:so_save | let &siso = s:siso_save
doautoall SessionLoadPost
unlet SessionLoad
" vim: set ft=vim :
