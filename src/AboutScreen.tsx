import { Code2, HardDrive, Heart } from "lucide-react";

const REPO = "https://github.com/msurguy/gem-mine";
const AUTHOR = "https://makssurguy.com";

export default function AboutScreen() {
  return (
    <>
      <h1>About Gem Mine</h1>
      <p className="lede">
        A typing adventure for young learners: learn the keys, practise school
        spelling words, and dig for treasure.
      </p>
      <div className="grownups-page about-page">
        <section className="panel">
          <h2>
            <HardDrive size={22} aria-hidden /> Your progress stays here
          </h2>
          <p>
            Gem Mine has no accounts and no server. Gems, stars, treasures and
            word lists are saved only in this browser’s local storage, on this
            device. Nothing you type is sent anywhere, and the game has no ads
            or tracking.
          </p>
          <p>
            Clearing browser data erases progress, so use{" "}
            <strong>Grown-ups → Export progress</strong> to keep a backup or
            move to another device.
          </p>
        </section>
        <section className="panel">
          <h2>
            <Code2 size={22} aria-hidden /> Open source
          </h2>
          <p>
            The code is free to read, copy and change under the MIT license. You
            can add your own word lists, or host your own copy of the game.
          </p>
          <p>
            <a href={REPO} target="_blank" rel="noreferrer">
              Gem Mine on GitHub
            </a>
          </p>
        </section>
        <section className="panel">
          <h2>
            <Heart size={22} aria-hidden /> Made by Maks Surguy
          </h2>
          <p>
            Gem Mine is a hobby project, shared so families and classrooms can
            use it too.
          </p>
          <p>
            <a href={AUTHOR} target="_blank" rel="noreferrer">
              makssurguy.com
            </a>
          </p>
          <p className="muted">
            Sound effects from SFX Kit (CC0). Icons from Lucide. Fonts from
            Google Fonts.
          </p>
        </section>
      </div>
    </>
  );
}
