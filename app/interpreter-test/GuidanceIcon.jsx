export default function GuidanceIcon({name,...props}){
 const paths={
  route:'M5 5h3a4 4 0 0 1 4 4v6a4 4 0 0 0 4 4h3m-3-3 3 3-3 3M3 3h4v4H3z',
  gate:'M4 4h5v16H4zM15 4h5v16h-5zM9 9h6m-3-3 3 3-3 3',
  fares:'M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4zM14 6v12',
  tour:'M12 21s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12Z M12 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  found:'M4 8h16l1 13H3L4 8Zm4 0V6a4 4 0 0 1 8 0v2',
  lost:'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM15 15l5 5',
  timetable:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l4 2',
  facility:'M4 21V5h16v16M2 21h20M8 9h2m4 0h2M8 13h2m4 0h2M10 21v-4h4v4',
  feedback:'M4 4h16v12H9l-5 4V4Zm4 5h8m-8 3h5',
  live:'M7 3h10a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Zm-3 8h16M9 6h6M8 18l-2 3m10-3 2 3M8 15h.01M16 15h.01',
  send:'m3 3 18 9-18 9 4-9-4-9Zm4 9h14',
  back:'m15 5-7 7 7 7',close:'m6 6 12 12M18 6 6 18',plus:'M12 4v16M4 12h16',arrow:'m9 6 6 6-6 6'
 };
 return <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><path d={paths[name]||paths.route}/></svg>;
}
