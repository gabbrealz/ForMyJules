import { useEffect } from 'react';

export function usePageTitle(
  title: string,
  { restoreOnUnmount = true, addBrand = true } = {}
) {
  useEffect(() => {
    // 1. Keep track of the original title before this component mounted
    const previousTitle = document.title;

    // 2. Set the new title
    document.title = addBrand ? title + " | Our Little Howm" : title;

    // 3. Cleanup function: runs when the component unmounts
    return () => {
      if (restoreOnUnmount) {
        document.title = previousTitle;
      }
    };
  }, [title, restoreOnUnmount]); // Re-runs if the title string changes
}
