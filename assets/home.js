'use strict';
const defaultProfile={intro:'记录学习，分享创作。\n让那些“要不试试”，有一个开始的地方。',about:'一个练习把想法做出来的小站。从安排一天，到整理知识，再到搭建自己的网页，每个小作品都从一个具体的问题开始。'};
let profile=App.read('everyday-home-v1',defaultProfile);if(!profile||typeof profile.intro!=='string'||typeof profile.about!=='string')profile={...defaultProfile};
function renderProfile(){document.getElementById('intro-copy').textContent=profile.intro;document.getElementById('about-copy').textContent=profile.about;}
document.getElementById('year').textContent=new Date().getFullYear();renderProfile();
function editProfile(){document.getElementById('intro-input').value=profile.intro;document.getElementById('about-input').value=profile.about;document.getElementById('profile-dialog').showModal();}
document.getElementById('edit-home').onclick=editProfile;document.getElementById('edit-about').onclick=editProfile;
document.querySelector('[data-close]').onclick=()=>document.getElementById('profile-dialog').close();
document.getElementById('profile-form').onsubmit=e=>{e.preventDefault();profile={intro:document.getElementById('intro-input').value.trim(),about:document.getElementById('about-input').value.trim()};if(!profile.intro||!profile.about)return;const saved=App.save('everyday-home-v1',profile);renderProfile();document.getElementById('profile-dialog').close();if(saved)App.toast('已保存。这个浏览器里的小站，是你的了。');};
document.getElementById('reset-profile').onclick=()=>{App.confirm('恢复示例介绍？','会替换本机保存的两段介绍。',()=>{profile={...defaultProfile};App.save('everyday-home-v1',profile);renderProfile();document.getElementById('profile-dialog').close();});};
document.querySelectorAll('[data-filter]').forEach(button=>button.onclick=()=>{document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});document.querySelectorAll('[data-category]').forEach(card=>card.hidden=button.dataset.filter!=='all'&&card.dataset.category!==button.dataset.filter);});
