document.addEventListener("DOMContentLoaded", function () {
  // 版本檢查：F12 → Console 看得到，就代表線上跑的是這一版
  console.log(
    "[viewer] script v9 / css:",
    getComputedStyle(document.documentElement).getPropertyValue(
      "--viewer-version",
    ) || "舊版或沒套用",
  );
  const bookEl = document.getElementById("book");
  const mainEl = bookEl.parentElement; // .book-container
  const pages = document.querySelectorAll(".my-page");
  const total = pages.length;

  const btnPrev = document.getElementById("btn-prev");
  const btnNext = document.getElementById("btn-next");
  const label = document.getElementById("page-label");
  const bar = document.getElementById("progress");
  const barFill = document.getElementById("progress-fill");

  // 進度條的拖曳圓點（用 JS 加上去，不用改 HTML）
  const thumb = document.createElement("div");
  thumb.id = "progress-thumb";
  bar.appendChild(thumb);

  const PW = 500; // 單頁寬
  const PH = 911; // 單頁高
  const MIN_W = 140; // 單頁最小寬度（手機對開時每頁很小）

  /* ---------- 0. 手機版版面：按鈕搬到書本下方，與頁碼同一列 ---------- */
  const controlsEl = document.querySelector(".book-controls");
  const mobileMQ = window.matchMedia("(max-width: 700px)");
  const navRow = document.createElement("div");
  navRow.className = "nav-row";

  function placeLayout() {
    if (mobileMQ.matches) {
      // 頁碼在上；下面一列：[←] ━━━●━━━ [→]
      navRow.append(btnPrev, bar, btnNext);
      controlsEl.append(label, navRow);
    } else {
      // 桌機：按鈕回到書本左右，頁碼在上、進度條在下
      mainEl.insertBefore(btnPrev, bookEl);
      mainEl.appendChild(btnNext);
      controlsEl.append(label, bar);
      navRow.remove();
    }
  }
  placeLayout();

  /* ---------- 1. 把 #book 算成「剛好等於書本比例」的像素尺寸 ----------
     stretch 模式下，如果容器比書本還寬，套件需要自己置中，
     硬皮翻頁（封面/封底）會因此錯位。所以直接給它剛好的大小，不留空白。 */
  function sizeBook() {
    const cs = getComputedStyle(mainEl);
    const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const ratio = (2 * PW) / PH; // 對開的寬高比

    let w;
    if (mobileMQ.matches) {
      // 手機：容器高度由內容決定，只看寬度，書本撐滿整個螢幕寬
      w = mainEl.clientWidth - padX;
    } else {
      // 桌機：左右按鈕是絕對定位，不佔版面，只需預留兩側空間
      const sideBtns =
        btnPrev.parentElement === mainEl ? 2 * (btnPrev.offsetWidth + 24) : 0;
      const availW = mainEl.clientWidth - padX - sideBtns;
      const availH = mainEl.clientHeight - padY;
      w = Math.min(availW, availH * ratio);
    }
    mainEl.style.setProperty("--book-w", Math.floor(w) + "px"); // 給 CSS 定位按鈕用
    bookEl.style.width = Math.floor(w) + "px";
    bookEl.style.height = Math.floor(w / ratio) + "px";
  }
  sizeBook();

  const pageFlip = new St.PageFlip(bookEl, {
    width: PW,
    height: PH,
    size: "stretch",
    minWidth: MIN_W,
    maxWidth: 2000,
    minHeight: 400,
    maxHeight: 2500,
    showCover: true,
    usePortrait: false, // 手機也維持對開
    mobileScrollSupport: false,
    flippingTime: 800,
    maxShadowOpacity: 0.5,
    drawShadow: true,
  });
  pageFlip.loadFromHTML(pages);

  const isLandscape = () => pageFlip.getOrientation() === "landscape";
  const current = () => pageFlip.getCurrentPageIndex();

  /* ---------- 2. 封面 / 封底單頁置中 ---------- */
  function applyShift(index) {
    let x = 0;
    if (isLandscape()) {
      const w = bookEl.offsetWidth; // #book 已被精準設成書本大小
      if (index === 0) x = -w / 4;
      else if (index >= total - 1) x = w / 4;
    }
    bookEl.style.transform = "translateX(" + x + "px)";
  }

  /* ---------- 3. 頁碼 / 進度條顯示 ---------- */
  const pad = (n) => String(n).padStart(2, "0");

  function render(index) {
    const isSpread = isLandscape() && index > 0 && index < total - 1;
    label.textContent =
      (isSpread ? pad(index + 1) + "–" + pad(index + 2) : pad(index + 1)) +
      " / " +
      total;
    const pct = (index / (total - 1)) * 100 + "%";
    barFill.style.width = pct;
    thumb.style.left = pct;
  }

  function updateUI(index) {
    render(index);
    btnPrev.disabled = index <= 0;
    btnNext.disabled = index >= total - 1;
  }

  /* ---------- 4. 按鈕 / 鍵盤 ---------- */
  btnNext.addEventListener("click", () => pageFlip.flipNext());
  btnPrev.addEventListener("click", () => pageFlip.flipPrev());

  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight" && !btnNext.disabled) btnNext.click();
    if (e.key === "ArrowLeft" && !btnPrev.disabled) btnPrev.click();
  });

  /* ---------- 5. 可拖曳的進度條（像影片進度條） ---------- */
  // 雙頁模式下內頁以「左頁」為單位（1,3,5…），把偶數換成它的左頁
  function normalize(i) {
    if (isLandscape() && i > 0 && i < total - 1 && i % 2 === 0) return i - 1;
    return i;
  }

  function indexFromEvent(e) {
    const r = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    return normalize(Math.round(ratio * (total - 1)));
  }

  let dragging = false;
  let moved = false;
  let startX = 0;

  bar.addEventListener("pointerdown", function (e) {
    dragging = true;
    moved = false;
    startX = e.clientX;
    bar.setPointerCapture(e.pointerId);
    bar.classList.add("dragging");
    render(indexFromEvent(e));
  });

  bar.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    if (Math.abs(e.clientX - startX) > 3) moved = true;
    render(indexFromEvent(e)); // 拖曳時只預覽頁碼，放開才翻
  });

  function endDrag(e, cancelled) {
    if (!dragging) return;
    dragging = false;
    bar.classList.remove("dragging");
    const cur = current();
    if (cancelled) return updateUI(cur);
    const target = indexFromEvent(e);
    if (target === cur) return updateUI(cur);
    if (moved) {
      pageFlip.turnToPage(target); // 拖曳：直接跳到該頁
      applyShift(target);
      updateUI(target);
    } else {
      pageFlip.flip(target); // 單點：有翻頁動畫
    }
  }
  bar.addEventListener("pointerup", (e) => endDrag(e, false));
  bar.addEventListener("pointercancel", (e) => endDrag(e, true));

  /* ---------- 6. 翻頁事件、初始化、縮放 ---------- */
  pageFlip.on("flip", function (e) {
    applyShift(e.data);
    updateUI(e.data);
  });

  function refresh() {
    applyShift(current());
    updateUI(current());
  }
  pageFlip.on("init", refresh);
  setTimeout(refresh, 100);

  window.addEventListener("resize", function () {
    bookEl.style.transition = "none";
    placeLayout();
    sizeBook();
    pageFlip.update();
    refresh();
    requestAnimationFrame(() => (bookEl.style.transition = ""));
  });
});
