import { keepPictures, anchorPictures } from './select.js';
import { chooseCover } from './cover';
import { createPictureStore } from './store';

export async function attachPictures({ pictures, pageCount = 0, chapters, ratioOf, cover: declaredCover = null }) {
  const kept = keepPictures(pictures, pageCount);
  const cover = declaredCover || (await chooseCover(kept));
  const store = createPictureStore();
  const coverImage = cover ? await store.save(cover, 'cover') : null;

  const body = kept.filter((p) => p.id !== cover?.id);
  const placed = anchorPictures(body, chapters, ratioOf);
  const stamp = Date.now();
  let count = 0;
  const withImages = [];

  for (let i = 0; i < chapters.length; i += 1) {
    const images = [];
    for (const picture of placed[i]) {
      const uri = await store.save(picture);
      if (!uri) continue;
      count += 1;
      images.push({ id: `img-${stamp}-${count}`, uri, offset: picture.offset, width: picture.width, height: picture.height });
    }
    withImages.push(images.length ? { ...chapters[i], images } : chapters[i]);
  }

  return { chapters: withImages, coverImage };
}

export async function pagesAsChapters(pictures, label) {
  const store = createPictureStore();
  const stamp = Date.now();
  const byPage = new Map();
  pictures.forEach((p) => {
    const current = byPage.get(p.pageIndex);
    if (!current || p.width * p.height > current.width * current.height) byPage.set(p.pageIndex, p);
  });
  const ordered = [...byPage.values()].sort((a, b) => a.pageIndex - b.pageIndex).slice(0, 60);
  const chapters = [];
  for (const picture of ordered) {
    const uri = await store.save(picture, 'scan');
    if (!uri) continue;
    chapters.push({ id: `chap-${stamp}-${chapters.length + 1}`, title: `${label} ${picture.pageIndex + 1}`, content: 'Página digitalizada. Abra o editor deste capítulo e use Transcrever para obter o texto da imagem.', photo: uri });
  }
  return chapters;
}
