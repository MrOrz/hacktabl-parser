import fetch from 'isomorphic-fetch';

export default function fetchJson(url) {
  return fetch(url).then(resp => resp.json())
}
