"use client";

import { useEffect, useState } from "react";
import { mediaUrl } from "@/lib/config";

const content = {
  title: {
    header: "愛妻",
    text: () => (
      <>
        <p>
          你是天上無憂無慮的天使，來到人間尋找那純潔無瑕的愛。上帝讓我們相遇，你甘心和我相知、相愛。
          謝謝你給我一個溫暖的家和兩個可愛的孩子！謝謝你陪伴我走過的人生道路！孩子你無需牽掛，我會好好照顧的。
          你在天上也看顧他們，陪伴他們堅強地走好前面的道路，他們會使你驕傲的！
        </p>
        <p>
          每想起今生再見無期，總是讓我痛徹心扉！但主這一切都是祢允許的，必有祢的安排！或許祢是藉著海婕的離開，
          告訴我什麼是真愛，讓我重新歸向祢。也提醒我，我們的盼望在天上！
        </p>
      </>
    ),
  },
  grow: {
    header: "成長",
    text: () => (
      <>
        <p>
          海婕的一生都有神的眷顧和保守，早年神帶領海婕孤身遠赴美國求學，
          1996.9－1999.5在美国爱荷华州威斯大学攻讀本科（會計專業），
          期間考取美国注册会计师。在美國期間海婕開始進入教會，接受福音。
          畢業後於1999.1-2001.1在美国蓝盾保险公司任職审计。2002年婚後繼續學習深造，2005年12月獲得利物浦大學MBA學位。
        </p>
        <p>
          神也讓我們通過教會的姐妹認識，2000年第一次在溫哥華相會後，我們很快相互吸引，相知、相戀。
          同年海婕回國照顧重病的父親，2001年海婕辭去美國的工作，為了和我相聚移民溫哥華。我們於2002年1月28日在溫哥華結婚，
          婚後海婕辭去工作專心照顧家庭和孩子。
        </p>
      </>
    ),
  },
  believe: {
    header: "信主",
    text: () => (
      <>
        <p>
          海婕在美國求學期間開始接觸福音，於2000年2月20日在美國春田華人教會雪牧師的帶領下決志信主，同年12月24日在美國
          密蘇里州哥倫比亞城由高榮德牧師受洗歸主，成為神的兒女。
        </p>
        <p>
          婚後一家人一直在西49街的Trinity Baptist
          Church聚會，直到2005年跟隨我回國工作。2016年全家回遷溫哥華後，就一直在三聯市信友堂參加聚會，侍奉主。
          海婕一生平淡，凡事不求自己的好處，尊主為大，直到離世的日子。
        </p>
      </>
    ),
  },
  hope: {
    header: "盼望",
    text: () => (
      <>
        <p>
          海婕最後日子裡，每天晚上吃完飯就早早說要禱告，親近神。雖然海婕離開的很突然，但海婕是蒙恩的人，就能夠在死後還有盼望，只是睡了而已。就如經上記載：
          <q>
            『我們若信耶穌死了，又復活了，照樣，也應該相信那些靠着耶穌已經睡了的人，神必定把他們和耶穌一同帶來。』
          </q>
          （帖前4：14）『看哪，我必快來！凡遵守這書上預言的有福了。』（啓22：7），這是何等的應許，何等的盼望！
        </p>
        <p>
          海婕，那美好的仗你已經打過了，當跑的路你已經跑盡了，所信的道你已經守住了。卸下你的重擔，在父的懷中安息吧。。。
        </p>
        <p>
          我們在主裏的人，靠着主耶穌基督，不過是睡了的人，有一天我們在主裏必定再相聚。讓我們彼此安慰，並一同走在這條充滿盼望，勝過死亡的人生道路上！
        </p>
      </>
    ),
  },
} as const;

type NavKey = keyof typeof content;

function Chapter({ nav }: { nav: NavKey }) {
  const [className, setClass] = useState({
    content: "contentInit",
    inner: "innerInit",
  });

  useEffect(() => {
    const id = window.setTimeout(() => {
      setClass({ content: "content", inner: "inner" });
    }, 100);
    return () => {
      window.clearTimeout(id);
      setClass({ content: "contentInit", inner: "innerInit" });
    };
  }, [nav]);

  return (
    <div className={className.content}>
      <div className={className.inner}>
        <h2>{content[nav].header}</h2>
        {content[nav].text()}
      </div>
    </div>
  );
}

export default function Journey({ timeout }: { timeout?: boolean }) {
  const [nav, setNav] = useState<NavKey>("title");

  return (
    <header id="journey-header" style={timeout ? { display: "none" } : {}}>
      <div className="logo">
        <img src={mediaUrl("images/icons/website-icon.png")} alt="Haijie" />
      </div>
      <Chapter nav={nav} />
      <nav>
        <ul>
          <li>
            <button type="button" onClick={() => setNav("grow")}>
              成長
            </button>
          </li>
          <li>
            <button type="button" onClick={() => setNav("believe")}>
              信主
            </button>
          </li>
          <li>
            <button type="button" id="journey-button" onClick={() => setNav("hope")}>
              盼望
            </button>
          </li>
        </ul>
      </nav>
    </header>
  );
}
