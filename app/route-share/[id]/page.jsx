'use client';
import {useParams} from 'next/navigation';
import SharedRouteView from '../../v2/route-lab/SharedRouteView';
export default function SharedRoute(){const {id}=useParams();return <SharedRouteView id={id}/>;}
