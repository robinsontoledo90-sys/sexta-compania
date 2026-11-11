'use strict';
(() => {
  const $ = id => document.getElementById(id);
  let role = null;
  const seed = () => [
    {id:'emergencias',title:'Asistencia en tiempo real a emergencias',name:'Ejercicio ficticio E-06 · Respuesta de unidad',open:true,mine:false,others:2},
    {id:'academia',title:'Asistencia en tiempo real academia',name:'Academia ficticia A-06 · Comunicaciones',open:true,mine:false,others:1}
  ];
  let activities = seed();
  function announce(text) { $('message').textContent = text; }
  function render() {
    $('entry').hidden = !!role;
    $('dashboard').hidden = !role;
    if (!role) return;
    const officer = role === 'oficial';
    $('title').textContent = officer ? 'Panel Oficial' : 'Panel Voluntario';
    $('permissions').textContent = officer ? 'Oficial de prueba · Supervisión y gestión de actividades ficticias.' : 'Voluntario de prueba · Consulta y registro de tu propia asistencia ficticia.';
    $('command').hidden = !officer;
    $('activities').replaceChildren();
    for (const activity of activities) {
      const card = document.createElement('section'); card.className = 'card';
      const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = 'DEMO · ' + (activity.open ? 'Actividad abierta' : 'Actividad cerrada');
      const title = document.createElement('h2'); title.textContent = activity.title;
      const name = document.createElement('p'); name.className = 'fixture'; name.textContent = activity.name + ' · Sin incidente real ni horario operativo.';
      const info = document.createElement('p'); info.className = 'count';
      info.textContent = officer ? String(activity.others + Number(activity.mine)) : (activity.mine ? 'Registrada' : 'Sin registrar');
      const label = document.createElement('small'); label.textContent = officer ? 'asistencias ficticias · actualización local' : 'mi asistencia de prueba'; info.append(label);
      const actions = document.createElement('div'); actions.className = 'actions';
      const button = document.createElement('button');
      button.textContent = officer ? (activity.open ? 'Cerrar actividad de prueba' : 'Abrir actividad de prueba') : (activity.mine ? 'Retirar mi asistencia de prueba' : 'Registrar mi asistencia de prueba');
      button.disabled = !officer && !activity.open;
      button.addEventListener('click', () => {
        if (role === 'oficial') activity.open = !activity.open;
        else if (role === 'voluntario' && activity.open) activity.mine = !activity.mine;
        else return;
        render(); announce('Cambio simulado en ' + activity.title + '. No se guardó ni envió ningún registro real.');
      });
      actions.append(button); card.append(badge,title,name,info,actions);
      if (!officer && !activity.open) { const note=document.createElement('p'); note.textContent='El oficial cerró esta actividad de prueba. El registro está bloqueado en la demo.'; card.append(note); }
      $('activities').append(card);
    }
    $('roster').replaceChildren();
    if (officer) for (const [name,emergency,academy] of [
      ['Voluntario de prueba (tu perfil)',activities[0].mine,activities[1].mine],
      ['Persona ficticia A',true,true],['Persona ficticia B',true,false]
    ]) {
      const row=document.createElement('tr');
      for (const text of [name,emergency?'Registrada':'Sin registrar',academy?'Registrada':'Sin registrar']) {const cell=document.createElement('td');cell.textContent=text;row.append(cell);}
      $('roster').append(row);
    }
  }
  // Public fixtures, never credentials for a real service. No auth client is loaded.
  const accounts = [
    {username:'oficial.demo',password:'OficialDemo6!',role:'oficial'},
    {username:'voluntario.demo',password:'VoluntarioDemo6!',role:'voluntario'}
  ];
  $('demoLogin').addEventListener('submit', event => {
    event.preventDefault();
    const account=accounts.find(item=>item.username===$('username').value.trim().toLowerCase() && item.password===$('password').value);
    $('password').value='';
    if (!account) { $('loginError').textContent='Usuario o contraseña ficticios incorrectos. Usa una de las cuentas de prueba indicadas abajo.'; return; }
    $('loginError').textContent=''; $('username').value='';
    role=account.role;render();announce('Sesión de prueba iniciada. Permisos simulados, sin cuenta real.');$('title').setAttribute('tabindex','-1');$('title').focus();
  });
  $('switch').addEventListener('click', () => { role=null;$('demoLogin').reset();$('loginError').textContent='';render();announce('Sesión de prueba cerrada. Puedes ingresar con la otra cuenta; los cambios ficticios se conservan hasta reiniciar o recargar.');$('username').focus(); });
  $('reset').addEventListener('click', () => { activities=seed();render();announce('Demostración reiniciada con los datos ficticios iniciales.'); });
  render();
})();
