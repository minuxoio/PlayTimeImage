document.addEventListener("DOMContentLoaded", function () {
  const bookEl = document.getElementById("book");
  const pages = document.querySelectorAll(".my-page");
  const total = pages.length;

  const btnPrev = document.getElementById("btn-prev");
  const btnNext = document.getElementById("btn-next");
  const label = document.getElementById("page-label");
  const bar = document.getElementById("progress");
  const barFill = document.getElementById("progress-fill");

  const pageFlip = new St.PageFlip(bookEl, {
    width: 500,
    height: 911,
    size: "stretch",
    minWidth: 300,
    maxWidth: 2000,
    minHeight: 400,
    maxHeight: 2500,
    showCover: true,
    usePortrait: true,
    mobileScrollSupport: false,
    flippingTime: 800,
    maxShadowOpacity: 0.5,
    drawShadow: true,
  });
  pageFlip.loadFromHTML(pages);

  const isLandscape = () => pageFlip.getOrientation() === "landscape";

  // 封面只有右半邊、封底只有左半邊，所以把整本書往內推 1/4 書寬，讓單頁置中
  function applyShift(index) {
    const parent = bookEl.querySelector(".stf__parent");
    let x = 0;
    if (parent && isLandscape()) {
      const w = parent.offsetWidth;
      if (index === 0) x = -w / 4;
      else if (index >= total - 1) x = w / 4;
    }
    bookEl.style.transform = "translateX(" + x + "px)";
  }

  function updateUI(index) {
    const pad = (n) => String(n).padStart(2, "0");
    const isSpread = isLandscape() && index > 0 && index < total - 1;
    label.textContent =
      (isSpread ? pad(index + 1) + "–" + pad(index + 2) : pad(index + 1)) +
      " / " +
      total;
    barFill.style.width = (index / (total - 1)) * 100 + "%";
    btnPrev.disabled = index <= 0;
    btnNext.disabled = index >= total - 1;
  }

  // 按鈕翻頁：只負責翻頁，位置校正交給下方的 flip 事件（翻完才滑動，避免兩個動畫互相干擾）
  btnNext.addEventListener("click", function () {
    pageFlip.flipNext();
  });
  btnPrev.addEventListener("click", function () {
    pageFlip.flipPrev();
  });

  // 鍵盤左右鍵
  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight" && !btnNext.disabled) btnNext.click();
    if (e.key === "ArrowLeft" && !btnPrev.disabled) btnPrev.click();
  });

  // 點進度條跳頁
  bar.addEventListener("click", function (e) {
    const r = bar.getBoundingClientRect();
    const ratio = (e.clientX - r.left) / r.width;
    const target = Math.round(ratio * (total - 1));
    pageFlip.flip(target);
  });

  // 拖曳翻頁（或其他方式）結束後，統一校正一次
  pageFlip.on("flip", function (e) {
    applyShift(e.data);
    updateUI(e.data);
  });

  pageFlip.on("init", function () {
    applyShift(pageFlip.getCurrentPageIndex());
    updateUI(pageFlip.getCurrentPageIndex());
  });

  window.addEventListener("resize", function () {
    bookEl.style.transition = "none";
    applyShift(pageFlip.getCurrentPageIndex());
    updateUI(pageFlip.getCurrentPageIndex());
    requestAnimationFrame(function () {
      bookEl.style.transition = "";
    });
  });

  // 保險：初始化完成後再算一次
  setTimeout(function () {
    applyShift(pageFlip.getCurrentPageIndex());
    updateUI(pageFlip.getCurrentPageIndex());
  }, 100);
});
