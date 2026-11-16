import {createElement} from 'react';

/* Lucide 0.468.0 icon geometry.
ISC License

Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2022.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/
const shapes={
 "customerOffice": [
  [
   "path",
   {
    "d": "M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z"
   }
  ],
  [
   "path",
   {
    "d": "M21 16v2a4 4 0 0 1-4 4h-5"
   }
  ]
 ],
 "toilet": [
  [
   "path",
   {
    "d": "M7 12h13a1 1 0 0 1 1 1 5 5 0 0 1-5 5h-.598a.5.5 0 0 0-.424.765l1.544 2.47a.5.5 0 0 1-.424.765H5.402a.5.5 0 0 1-.424-.765L7 18"
   }
  ],
  [
   "path",
   {
    "d": "M8 18a5 5 0 0 1-5-5V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8"
   }
  ]
 ],
 "elevator": [
  [
   "path",
   {
    "d": "m21 16-4 4-4-4"
   }
  ],
  [
   "path",
   {
    "d": "M17 20V4"
   }
  ],
  [
   "path",
   {
    "d": "m3 8 4-4 4 4"
   }
  ],
  [
   "path",
   {
    "d": "M7 4v16"
   }
  ]
 ],
 "locker": [
  [
   "path",
   {
    "d": "M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"
   }
  ],
  [
   "path",
   {
    "d": "M12 22V12"
   }
  ],
  [
   "path",
   {
    "d": "m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7"
   }
  ],
  [
   "path",
   {
    "d": "m7.5 4.27 9 5.15"
   }
  ]
 ],
 "escalator": [
  [
   "path",
   {
    "d": "M7 7h10v10"
   }
  ],
  [
   "path",
   {
    "d": "M7 17 17 7"
   }
  ]
 ],
 "nursing": [
  [
   "path",
   {
    "d": "M9 12h.01"
   }
  ],
  [
   "path",
   {
    "d": "M15 12h.01"
   }
  ],
  [
   "path",
   {
    "d": "M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"
   }
  ],
  [
   "path",
   {
    "d": "M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"
   }
  ]
 ],
 "atm": [
  [
   "rect",
   {
    "width": "20",
    "height": "14",
    "x": "2",
    "y": "5",
    "rx": "2"
   }
  ],
  [
   "line",
   {
    "x1": "2",
    "x2": "22",
    "y1": "10",
    "y2": "10"
   }
  ]
 ],
 "search": [
  [
   "circle",
   {
    "cx": "11",
    "cy": "11",
    "r": "8"
   }
  ],
  [
   "path",
   {
    "d": "m21 21-4.3-4.3"
   }
  ]
 ],
 "refresh": [
  [
   "path",
   {
    "d": "M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"
   }
  ],
  [
   "path",
   {
    "d": "M21 3v5h-5"
   }
  ]
 ],
 "clock": [
  [
   "circle",
   {
    "cx": "12",
    "cy": "12",
    "r": "10"
   }
  ],
  [
   "polyline",
   {
    "points": "12 6 12 12 16.5 12"
   }
  ]
 ],
 "phone": [
  [
   "path",
   {
    "d": "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
   }
  ]
 ],
 "arrow": [
  [
   "path",
   {
    "d": "M7 7h10v10"
   }
  ],
  [
   "path",
   {
    "d": "M7 17 17 7"
   }
  ]
 ],
 "accessible": [
  [
   "circle",
   {
    "cx": "16",
    "cy": "4",
    "r": "1"
   }
  ],
  [
   "path",
   {
    "d": "m18 19 1-7-6 1"
   }
  ],
  [
   "path",
   {
    "d": "m5 8 3-3 5.5 3-2.36 3.5"
   }
  ],
  [
   "path",
   {
    "d": "M4.24 14.5a5 5 0 0 0 6.88 6"
   }
  ],
  [
   "path",
   {
    "d": "M13.76 17.5a5 5 0 0 0-6.88-6"
   }
  ]
 ],
 "check": [
  [
   "circle",
   {
    "cx": "12",
    "cy": "12",
    "r": "10"
   }
  ],
  [
   "path",
   {
    "d": "m9 12 2 2 4-4"
   }
  ]
 ],
 "close": [
  [
   "path",
   {
    "d": "M18 6 6 18"
   }
  ],
  [
   "path",
   {
    "d": "m6 6 12 12"
   }
  ]
 ]
};

export default function FacilityIcon({name}){
 return <svg className="sf-vector" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{(shapes[name]||shapes.toilet).map(([tag,attributes],index)=>createElement(tag,{...attributes,key:index}))}</svg>;
}
